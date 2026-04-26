import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../generated/prisma/client";
import { PrismaClient as PrismaClientConstructor } from "../generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Cliente Prisma (solo en servidor; requiere `DATABASE_URL` en runtime).
 * No instancies en componentes de cliente.
 */
export function getPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({ connectionString: url });
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pool);
    globalForPrisma.prisma = new PrismaClientConstructor({ adapter });
  }
  return globalForPrisma.prisma;
}
