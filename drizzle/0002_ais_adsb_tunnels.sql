-- AIS / ADS-B live snapshots + submarine tunnels (cloud logs)
-- Apply: npm run cf:d1:migrate:remote

CREATE TABLE IF NOT EXISTS ais_vessels (
  id TEXT PRIMARY KEY,
  mmsi TEXT NOT NULL,
  ship_name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  sog REAL,
  cog REAL,
  true_heading REAL,
  ship_type INTEGER,
  ship_type_label TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  provider TEXT,
  timestamp TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ais_ingested ON ais_vessels (ingested_at);
CREATE INDEX IF NOT EXISTS idx_ais_category ON ais_vessels (category);
CREATE INDEX IF NOT EXISTS idx_ais_geo ON ais_vessels (lat, lng);

CREATE TABLE IF NOT EXISTS adsb_aircraft (
  id TEXT PRIMARY KEY,
  hex TEXT NOT NULL,
  mode TEXT NOT NULL,
  callsign TEXT,
  registration TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  altitude REAL,
  altitude_geom REAL,
  ground_speed REAL,
  track REAL,
  type TEXT,
  category TEXT,
  db_flags INTEGER,
  squawk TEXT,
  emergency TEXT,
  payload_json TEXT,
  hub TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adsb_ingested ON adsb_aircraft (ingested_at);
CREATE INDEX IF NOT EXISTS idx_adsb_mode ON adsb_aircraft (mode);
CREATE INDEX IF NOT EXISTS idx_adsb_geo ON adsb_aircraft (lat, lng);
CREATE INDEX IF NOT EXISTS idx_adsb_hex ON adsb_aircraft (hex);

CREATE TABLE IF NOT EXISTS submarine_tunnels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  start_lat REAL,
  start_lng REAL,
  end_lat REAL,
  end_lng REAL,
  country TEXT,
  length_km REAL,
  risk_note TEXT,
  related_tickers TEXT,
  tier INTEGER NOT NULL DEFAULT 1,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tunnels_geo ON submarine_tunnels (lat, lng);

INSERT OR REPLACE INTO submarine_tunnels (
  id, name, name_en, lat, lng, start_lat, start_lng, end_lat, end_lng,
  country, length_km, risk_note, related_tickers, tier, ingested_at
) VALUES
(
  'tunnel-eurotunnel',
  '유로터널',
  'Channel Tunnel',
  50.922, 1.831,
  51.097, 1.156,
  50.923, 1.780,
  'UK/FR', 50.5,
  '영·프 육상 물류·화물 열차 허리. 봉쇄·사보타주 시 유럽 공급망 즉각 타격.',
  'DXY · S&P 500 · Brent',
  1, datetime('now')
),
(
  'tunnel-seikan',
  '세이칸 터널',
  'Seikan Tunnel',
  41.35, 140.35,
  41.556, 140.352,
  41.178, 140.434,
  'JP', 53.9,
  '홋카이도·혼슈 철도 연결. 지진·해일·인프라 사고 시 일본 북부 물류 단절.',
  'Nikkei · JPY',
  1, datetime('now')
),
(
  'tunnel-marmaray',
  '마르마라이 터널',
  'Marmaray',
  41.005, 29.02,
  41.015, 28.975,
  40.997, 29.065,
  'TR', 13.6,
  '보스포루스 해저 철도. 흑해·지중해 물류·도시 교통 병목. 지진 리스크.',
  'Brent · Gold · TRY',
  1, datetime('now')
),
(
  'tunnel-busan-geoje',
  '거가대교 해저터널',
  'Busan–Geoje undersea',
  35.02, 128.75,
  35.078, 128.812,
  34.942, 128.684,
  'KR', 3.7,
  '부산·거제 연결. 동남권 조선·물류. 태풍·해상 사고 시 우회 비용.',
  'KOSPI · KRW',
  2, datetime('now')
),
(
  'tunnel-tokyo-aqua',
  '도쿄만 아쿠아라인',
  'Tokyo Bay Aqua-Line',
  35.45, 139.87,
  35.546, 139.796,
  35.36, 139.945,
  'JP', 9.5,
  '도쿄만 횡단 해저구간. 수도권 물류·통근. 재난 시 혼잡·우회.',
  'Nikkei · JPY',
  2, datetime('now')
),
(
  'tunnel-oresund',
  '외레순드 터널',
  'Øresund Tunnel',
  55.605, 12.77,
  55.571, 12.843,
  55.628, 12.695,
  'DK/SE', 4.0,
  '덴마크·스웨덴 연결 해저구간. 북유럽 화물·여객 허리.',
  'OMX · EUR',
  2, datetime('now')
),
(
  'tunnel-storebaelt',
  '스토레벨트 터널',
  'Great Belt Tunnel',
  55.34, 10.97,
  55.312, 10.888,
  55.365, 11.05,
  'DK', 8.0,
  '덴마크 본토·섬 연결. 북유럽 철도·도로 물류.',
  'OMX · EUR',
  2, datetime('now')
),
(
  'tunnel-hzmb',
  '강주아오 해저터널',
  'HK–Zhuhai–Macau undersea',
  22.28, 113.78,
  22.303, 113.72,
  22.26, 113.84,
  'CN/HK/MO', 6.7,
  '홍콩·주하이·마카오 연결. 대만해협·남중국해 긴장과 연동되는 물류 허브.',
  'Hang Seng · Shanghai · HKD',
  1, datetime('now')
),
(
  'tunnel-fehmarnbelt',
  '페마른벨트 터널(공사)',
  'Fehmarnbelt Tunnel',
  54.57, 11.35,
  54.50, 11.20,
  54.64, 11.50,
  'DK/DE', 18.0,
  '덴마크·독일 직결 해저터널(건설 중). 완공 시 북유럽 물류 재편.',
  'DAX · OMX · EUR',
  2, datetime('now')
),
(
  'tunnel-bosphorus-eurasia',
  '유라시아 터널',
  'Eurasia Tunnel',
  41.005, 28.995,
  41.004, 28.975,
  41.006, 29.015,
  'TR', 5.4,
  '이스탄불 도로용 보스포루스 해저터널. 도시·물류 병목.',
  'Brent · TRY',
  2, datetime('now')
);
