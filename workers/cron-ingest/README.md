# Cloudflare Cron Ingest (FIRMS + GDELT → D1)

Next.js `src/workers/`(브라우저 Web Worker)와 분리해 **`workers/cron-ingest/`** 에 둡니다.

## 구성

| 파일 | 역할 |
|------|------|
| `../../wrangler.toml` | Worker 이름, D1 바인딩, Cron `*/10 * * * *` |
| `schema.sql` | `firms_fires` / `gdelt_points` / `ingest_runs` |
| `src/index.ts` | Cron + `GET /health` · `GET /latest` · `POST /run` |
| `src/firms.ts` | NASA FIRMS area CSV (전장 bbox) |
| `src/gdelt.ts` | GDELT Geo API GeoJSON (ZIP 불필요) |

## 최초 세팅

```bash
# 1) 스키마 적용 (원격 D1)
npm run cf:d1:migrate:remote

# 2) FIRMS 키 (대시보드/.env 의 NASA_FIRMS_API_KEY)
npx wrangler secret put NASA_FIRMS_API_KEY

# 3) (선택) 수동 트리거 보호
npx wrangler secret put INGEST_CRON_SECRET

# 4) 배포
npm run cf:ingest:deploy
```

로컬:

```bash
cp .dev.vars.example .dev.vars
# .dev.vars 에 NASA_FIRMS_API_KEY=... 입력

npm run cf:d1:migrate:local
npm run cf:ingest:dev
# 다른 터미널에서: curl http://127.0.0.1:8787/run
```

## Cron

- 표현식: `*/10 * * * *` (10분마다)
- 실행 시 FIRMS(전장 5개 bbox) + GDELT(쿼리 4개) → D1 upsert → 48h 이전 행 prune

## Next 앱 연동 (다음 단계)

Next API에서 D1을 직접 쓰지 않고, Worker `GET /latest` 또는 별도 read API / R2 스냅샷을 읽도록 붙이면 됩니다.
