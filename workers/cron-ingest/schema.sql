-- Conflict View D1 schema — FIRMS + GDELT ingest snapshots
-- Apply: npm run cf:d1:migrate:remote   (or :local)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firms_fires (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  frp REAL,
  brightness REAL,
  confidence TEXT,
  acq_date TEXT,
  acq_time TEXT,
  satellite TEXT,
  daynight TEXT,
  source TEXT NOT NULL DEFAULT 'VIIRS_SNPP_NRT',
  theater TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_firms_ingested ON firms_fires (ingested_at);
CREATE INDEX IF NOT EXISTS idx_firms_theater ON firms_fires (theater);
CREATE INDEX IF NOT EXISTS idx_firms_geo ON firms_fires (lat, lng);

CREATE TABLE IF NOT EXISTS gdelt_points (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  name TEXT,
  url TEXT,
  mention_count INTEGER,
  share_image TEXT,
  query_tag TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gdelt_ingested ON gdelt_points (ingested_at);
CREATE INDEX IF NOT EXISTS idx_gdelt_tag ON gdelt_points (query_tag);
CREATE INDEX IF NOT EXISTS idx_gdelt_geo ON gdelt_points (lat, lng);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  firms_count INTEGER DEFAULT 0,
  gdelt_count INTEGER DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  detail_json TEXT
);
