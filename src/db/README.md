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
| `news_stream_snapshots` | 뉴스 스트림 페이로드 (패키지·언어) |
| `news_stream_items` | 뉴스 티어(1/2/3) 개별 아이템 |
| `ais_vessels` | MarineTraffic AIS 클라우드 로그 |
| `adsb_aircraft` | ADS-B 군용·민간 클라우드 로그 |
| `submarine_tunnels` | 해저터널 인프라 (온디맨드) |
| `dispute_hatch_paths` | 분쟁·중동(이란) 전선 빗금 스냅샷 |
| `dispute_hatch_builds` | 분쟁 hatch 빌드 메타 |
| `ingest_runs` | Cron 실행 로그 |

## Commands

```bash
npm run db:generate          # schema → drizzle/*.sql
npm run db:migrate:local     # 로컬 D1
npm run db:migrate:remote    # 원격 D1
npm run db:studio            # Drizzle Studio (토큰 필요할 수 있음)
npm run viina:build          # VIINA zone 캐시
npm run ukraine:hatch:build  # 빗금 path 사전계산 → 파일(+D1)
npm run dispute:hatch:build  # 분쟁·중동 전선 hatch → 파일(+D1)
```

## Ukraine hatch offload

1. `npm run viina:build`
2. `npm run ukraine:hatch:build` (또는 `POST /api/render/ukraine-control-paths`)
3. 글로브는 D1/파일 사전계산 path만 뷰포트 필터 후 렌더 (클라 geometry hatch 없음)

## Dispute / Iran–ME hatch offload

1. `npm run tensions:regional` (disputes.json에 IRONSIGHT ME 시드 머지)
2. `npm run dispute:hatch:build`
3. 전쟁구역·외교긴장 토글 시 `/api/render/dispute-paths` → D1 스냅샷

## Next.js 사용 예

```ts
import { getDb } from "@/db";
import { firmsFires } from "@/db/schema";
import { desc } from "drizzle-orm";

const db = await getDb();
const rows = await db.select().from(firmsFires).orderBy(desc(firmsFires.ingestedAt)).limit(100);
```
