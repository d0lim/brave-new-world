import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Incremental cache(R2)는 선택. 필요 시 wrangler.jsonc에 NEXT_INC_CACHE_R2_BUCKET을 추가하세요.
export default defineCloudflareConfig({});
