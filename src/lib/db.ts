import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Client Prisma singleton (Prisma 7 + driver adapter `pg`).
 * En dev, le hot reload recrée les modules : on garde l'instance sur globalThis
 * pour ne pas ouvrir une nouvelle connexion à chaque rechargement.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  // La base locale `prisma dev` (PGlite) ne supporte qu'une connexion à la fois :
  // au-delà, elle coupe les connexions (erreur P1017). On limite donc le pool à 1
  // dès que la base est locale (dev OU `next start` en local). Neon n'est pas concerné.
  const host = new URL(env.DATABASE_URL).hostname;
  const isLocalDb = host === "localhost" || host === "127.0.0.1";
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    ...(isLocalDb ? { max: 1 } : {}),
  });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
