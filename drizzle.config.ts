import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit ↔ Cloudflare D1
 *
 * Generate:  npm run db:generate
 * Local:     npm run db:migrate:local
 * Remote:    npm run db:migrate:remote
 *
 * Remote HTTP 푸시(drizzle-kit migrate)용 — 계정 토큰이 있을 때:
 *   CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_TOKEN
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const databaseId =
  process.env.CLOUDFLARE_DATABASE_ID ?? "7e44bacd-d2f1-4c77-84c2-7be6b90fa0ae";
const token =
  process.env.CLOUDFLARE_D1_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN ?? "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(accountId && token
    ? {
        driver: "d1-http" as const,
        dbCredentials: {
          accountId,
          databaseId,
          token,
        },
      }
    : {}),
});
