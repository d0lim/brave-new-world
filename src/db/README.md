# Database (Drizzle + Cloudflare D1)

## Schema

- `src/db/schema.ts` — 테이블 정의
- `src/db/client.ts` — `createDb(d1)` (Workers / 바인딩)
- `src/db/index.ts` — Next.js용 `getDb()` (`wrangler getPlatformProxy`)

## Tables

| 테이블 | 용도 |
|--------|------|
| `firms_fires` | NASA FIRMS 라이브 |
| `ukraine_control_paths` | 점령/주장 빗금·테두리 사전계산 |
| `ukraine_control_builds` | 사전계산 빌드 메타 |
| `gdelt_points` | GDELT Geo 스냅샷 |
| `ingest_runs` | Cron 실행 로그 |

## Commands

```bash
npm run db:generate          # schema → drizzle/*.sql
npm run db:migrate:local     # 로컬 D1
npm run db:migrate:remote    # 원격 D1
npm run db:studio            # Drizzle Studio (토큰 필요할 수 있음)
```

## Next.js 사용 예

```ts
import { getDb } from "@/db";
import { firmsFires } from "@/db/schema";
import { desc } from "drizzle-orm";

const db = await getDb();
const rows = await db.select().from(firmsFires).orderBy(desc(firmsFires.ingestedAt)).limit(100);
```
