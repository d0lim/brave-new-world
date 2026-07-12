import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export type AppDb = DrizzleD1Database<typeof schema>;

/** Cloudflare D1 binding → Drizzle 클라이언트 */
export function createDb(d1: import("@cloudflare/workers-types").D1Database): AppDb {
  return drizzle(d1, { schema });
}

export type { schema };
