/**
 * Diagnóstico de conexión a Postgres ANTES de culpar a Prisma o a "timeout misterioso".
 *
 * Uso (en la raíz del repo):
 *   node scripts/diagnose-db.mjs
 *   npm run db:diagnose
 *
 * Carga .env, .env.local y .env.development (si existen).
 * Prueba DATABASE_URL y, si existe, DIRECT_DATABASE_URL con el mismo `pg` Pool
 * que usa la app (timeouts similares).
 */

import { spawnSync } from "child_process";
import { config } from "dotenv";
import { dirname, join } from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const f of [".env", ".env.local", ".env.development"]) {
  config({ path: join(root, f) });
}

function isPrismaDataPlatformUrl(url) {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("prisma+") ||
    url.startsWith("prisma://")
  );
}

function maskUrl(url) {
  if (!url || typeof url !== "string") return "(vacío)";
  if (isPrismaDataPlatformUrl(url)) {
    const q = url.includes("?") ? url.split("?")[1] : "";
    const hasKey = /api_key=/i.test(q);
    return `prisma+…@${url.includes("accelerate") ? "accelerate" : "dp"}${hasKey ? " (?api_key=***)" : ""}`;
  }
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url.slice(0, 40) + "…";
  }
}

function classify(err) {
  const code = err?.code;
  const msg = (err?.message || "").toLowerCase();
  const lines = [];
  if (code) lines.push(`Código Node/pg: ${code}`);
  if (code === "ECONNREFUSED") {
    lines.push("→ El host/puerto rechaza conexión (servicio caído, puerto mal, firewall).");
  } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    lines.push("→ DNS: el hostname no resuelve o red inestable.");
  } else if (code === "ETIMEDOUT") {
    lines.push("→ Timeout de red TCP (ruta lenta, firewall que tira paquetes, host lejano).");
  } else if (code === "28P01" || msg.includes("password authentication")) {
    lines.push("→ Usuario/contraseña incorrectos (o usuario sin permiso).");
  } else if (code === "57P03" || msg.includes("starting up")) {
    lines.push("→ Postgres aún arrancando (p. ej. serverless DB en frío).");
  } else if (msg.includes("timeout") || msg.includes("timed out")) {
    lines.push("→ Timeout (pool, conexión lenta o límite del proveedor). No implica solo 'red mala': puede ser cola en el proxy.");
  }
  return lines.join("\n   ");
}

async function testPool(label, connectionString) {
  console.log("\n" + "=".repeat(60));
  console.log(`Prueba: ${label}`);
  console.log(`URL (enmascarada): ${maskUrl(connectionString)}`);

  if (!connectionString?.trim()) {
    console.log("   (omitido: variable no definida)");
    return;
  }

  if (isPrismaDataPlatformUrl(connectionString)) {
    console.log(
      "   OMITIDO con `pg`: las URLs `prisma+postgres://` / `prisma://` son de Prisma Accelerate/DP;"
    );
    console.log(
      "   el driver `pg` necesita un `postgresql://` directo. Define DIRECT_DATABASE_URL con tu Postgres real, o mira el resultado de «prisma db execute» abajo."
    );
    return;
  }

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 60_000,
  });

  const t0 = Date.now();
  try {
    const { rows } = await pool.query(
      "SELECT 1 AS ok, current_database() AS db, version() AS version"
    );
    const ms = Date.now() - t0;
    console.log(`   OK — ${ms} ms`);
    console.log(`   Base: ${rows[0]?.db}`);
    console.log(`   Postgres: ${String(rows[0]?.version).slice(0, 60)}…`);
  } catch (err) {
    const ms = Date.now() - t0;
    console.error(`   ERROR — ${ms} ms`);
    console.error(`   ${err?.name}: ${err?.message}`);
    console.error("   " + classify(err).replace(/\n/g, "\n   "));
  } finally {
    await pool.end().catch(() => {});
  }
}

async function testPrismaCli() {
  console.log("\n" + "=".repeat(60));
  console.log("Prueba: npx prisma db execute (SELECT 1)");
  console.log("   (misma DATABASE_URL que Prisma CLI / migraciones)");
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "execute", "--stdin"],
    {
      cwd: root,
      input: "SELECT 1 AS ok;\n",
      encoding: "utf-8",
      env: process.env,
      shell: process.platform === "win32",
      maxBuffer: 2 * 1024 * 1024,
    }
  );
  if (r.status === 0) {
    console.log("   OK");
    if (r.stdout) console.log(r.stdout.trim());
  } else {
    console.error("   FALLO");
    if (r.stderr) console.error(r.stderr.trim());
    if (r.stdout) console.error(r.stdout.trim());
  }
}

console.log("Diagnóstico de base de datos — lee esto antes de cambiar URLs a ciegas.\n");

await testPool("DATABASE_URL (pool pg, como lib/db/prisma)", process.env.DATABASE_URL);
await testPool(
  "DIRECT_DATABASE_URL (si la usas para el pool)",
  process.env.DIRECT_DATABASE_URL
);

try {
  await testPrismaCli();
} catch (e) {
  console.error("   No se pudo ejecutar prisma db execute:", e?.message || e);
}

console.log("\n" + "=".repeat(60));
console.log("Interpretación rápida:");
console.log("- Si AQUÍ falla pero 'ping' a internet va: problema de URL, credenciales, firewall o proveedor DB.");
console.log("- Si aquí va OK pero la app sigue en timeout: revisa el mismo proceso en Next (dev), pool compartido, o Prisma adapter.");
console.log("");
