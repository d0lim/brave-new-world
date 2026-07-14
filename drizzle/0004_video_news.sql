-- 동영상 뉴스 메타 스냅샷 (본 RSS 스트림과 분리)
CREATE TABLE IF NOT EXISTS video_news_snapshots (
  cache_key TEXT PRIMARY KEY NOT NULL,
  topic TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ko',
  packages TEXT,
  payload_json TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_video_news_fetched ON video_news_snapshots (fetched_at);
CREATE INDEX IF NOT EXISTS idx_video_news_topic ON video_news_snapshots (topic);
