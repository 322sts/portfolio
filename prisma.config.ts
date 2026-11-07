// Configuration Prisma 7 : les variables de .env ne sont plus chargées
// automatiquement par la CLI, d'où l'import de dotenv.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migrations, seed, studio) passe par l'URL DIRECTE de Neon :
    // le pooler PgBouncer (mode transaction) casse Prisma Migrate
    // (« prepared statement "s0" already exists »). En local, seule DATABASE_URL existe.
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"] || "",
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] || undefined,
  },
});
