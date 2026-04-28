import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../generated/prisma/client";
import { PrismaClient as PrismaClientConstructor } from "../generated/prisma/client";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function isPrismaDataPlatformUrl(url: string): boolean {
  return url.startsWith("prisma+") || url.startsWith("prisma://");
}

/**
 * URL TCP para el `Pool` de `pg` (adaptador de driver).
 * Las URLs `prisma+postgres://` / `prisma://` (Accelerate/DP) no son válidas para `pg`.
 * En ese caso define `DIRECT_DATABASE_URL` con `postgresql://` al host real.
 */
function poolConnectionString(): string {
  const direct = process.env.DIRECT_DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }
  if (isPrismaDataPlatformUrl(url)) {
    throw new Error(
      "DATABASE_URL apunta a Prisma Accelerate/DP; el adaptador `pg` necesita una URL " +
        "`postgresql://` directa. Define DIRECT_DATABASE_URL con la conexión TCP a Postgres, " +
        "o ejecuta `npm run db:diagnose` para comprobar conectividad."
    );
  }
  return url;
}

/**
 * Cliente Prisma (solo en servidor; requiere `DATABASE_URL` en runtime).
 * No instancies en componentes de cliente.
 */
export function getPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida");
  }
  if (!globalForPrisma.pool) {
    const poolConfig: PoolConfig = {
      connectionString: poolConnectionString(),
      max: 10,
      /** ms para obtener una conexión libre del pool (0 = por defecto del driver) */
      connectionTimeoutMillis: 60_000,
    };
    globalForPrisma.pool = new Pool(poolConfig);
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pool);
    globalForPrisma.prisma = new PrismaClientConstructor({ adapter });
  }
  return globalForPrisma.prisma;
}
