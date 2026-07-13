-- Dispute / Middle East front hatch snapshots (Iran-Israel IRONSIGHT seeds included via disputes.json)
-- Apply: npm run cf:d1:migrate:remote

CREATE TABLE IF NOT EXISTS dispute_hatch_paths (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT,
  accent_color TEXT,
  lod_tier TEXT NOT NULL,
  points_json TEXT NOT NULL,
  point_count INTEGER NOT NULL DEFAULT 0,
  min_lat REAL,
  min_lng REAL,
  max_lat REAL,
  max_lng REAL,
  built_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dispute_hatch_dispute ON dispute_hatch_paths (dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_hatch_lod ON dispute_hatch_paths (lod_tier);
CREATE INDEX IF NOT EXISTS idx_dispute_hatch_geo ON dispute_hatch_paths (min_lat, max_lat, min_lng, max_lng);

CREATE TABLE IF NOT EXISTS dispute_hatch_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lod_tier TEXT NOT NULL,
  path_count INTEGER NOT NULL DEFAULT 0,
  dispute_count INTEGER NOT NULL DEFAULT 0,
  path_dispute_ids_json TEXT,
  source TEXT DEFAULT 'dispute-hatch-precompute',
  built_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_dispute_hatch_builds_lod ON dispute_hatch_builds (lod_tier);
