import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * D1 schema (Drizzle) — Conflict View
 *
 * - firms_fires: Cron ingest 라이브 산불/열원 (NASA FIRMS)
 * - ukraine_control_paths: 점령/주장 테두리·빗금 사전계산 path
 * - ukraine_control_builds: 사전계산 빌드 메타
 * - gdelt_points / ingest_runs: Cron ingest 호환
 */

/** NASA FIRMS 라이브 포인트 (workers/cron-ingest 와 동일 테이블) */
export const firmsFires = sqliteTable(
  "firms_fires",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    frp: real("frp"),
    brightness: real("brightness"),
    confidence: text("confidence"),
    acqDate: text("acq_date"),
    acqTime: text("acq_time"),
    satellite: text("satellite"),
    daynight: text("daynight"),
    source: text("source").notNull().default("VIIRS_SNPP_NRT"),
    theater: text("theater"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_firms_ingested").on(t.ingestedAt),
    theaterIdx: index("idx_firms_theater").on(t.theater),
    geoIdx: index("idx_firms_geo").on(t.lat, t.lng),
  }),
);

/**
 * 우크라이나 점령/주장 빗금·테두리 사전계산 결과.
 * 클라이언트 `buildUkraineFrontRender` 대신 D1에서 path를 읽어 그린다.
 *
 * kind 예:
 *  ukraine-ru-occupied | ukraine-ua-occupied
 *  ukraine-ru-occupied-hatch | ukraine-ua-occupied-hatch
 *  ukraine-ru-claim | ukraine-ua-claim
 *  ukraine-ru-claim-hatch | ukraine-ua-claim-hatch
 */
export const ukraineControlPaths = sqliteTable(
  "ukraine_control_paths",
  {
    id: text("id").primaryKey(),
    /** VIINA zone id */
    zoneId: text("zone_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    accentColor: text("accent_color"),
    /** overview | detail — LOD별 사전계산 세트 */
    lodTier: text("lod_tier").notNull(),
    /** VIINA 기준일 YYYYMMDD */
    controlDate: text("control_date").notNull(),
    /** JSON: Array<{ lat: number; lng: number }> */
    pointsJson: text("points_json").notNull(),
    pointCount: integer("point_count").notNull().default(0),
    minLat: real("min_lat"),
    minLng: real("min_lng"),
    maxLat: real("max_lat"),
    maxLng: real("max_lng"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    zoneIdx: index("idx_ua_paths_zone").on(t.zoneId),
    kindIdx: index("idx_ua_paths_kind").on(t.kind),
    lodDateIdx: index("idx_ua_paths_lod_date").on(t.lodTier, t.controlDate),
    geoIdx: index("idx_ua_paths_geo").on(t.minLat, t.maxLat, t.minLng, t.maxLng),
  }),
);

/** 우크라 사전계산 빌드 이력 */
export const ukraineControlBuilds = sqliteTable(
  "ukraine_control_builds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    controlDate: text("control_date").notNull(),
    lodTier: text("lod_tier").notNull(),
    pathCount: integer("path_count").notNull().default(0),
    zoneCount: integer("zone_count").notNull().default(0),
    source: text("source").default("viina-build"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    note: text("note"),
  },
  (t) => ({
    dateLodIdx: index("idx_ua_builds_date_lod").on(t.controlDate, t.lodTier),
  }),
);

/** GDELT Geo 스냅샷 (Cron ingest 호환) */
export const gdeltPoints = sqliteTable(
  "gdelt_points",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    name: text("name"),
    url: text("url"),
    mentionCount: integer("mention_count"),
    shareImage: text("share_image"),
    queryTag: text("query_tag"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_gdelt_ingested").on(t.ingestedAt),
    tagIdx: index("idx_gdelt_tag").on(t.queryTag),
    geoIdx: index("idx_gdelt_geo").on(t.lat, t.lng),
  }),
);

/** Cron / 빌드 실행 로그 */
export const ingestRuns = sqliteTable("ingest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  firmsCount: integer("firms_count").default(0),
  gdeltCount: integer("gdelt_count").default(0),
  ok: integer("ok").notNull().default(0),
  error: text("error"),
  detailJson: text("detail_json"),
});

export type FirmsFireRow = typeof firmsFires.$inferSelect;
export type NewFirmsFireRow = typeof firmsFires.$inferInsert;
export type UkraineControlPathRow = typeof ukraineControlPaths.$inferSelect;
export type NewUkraineControlPathRow = typeof ukraineControlPaths.$inferInsert;
export type UkraineControlBuildRow = typeof ukraineControlBuilds.$inferSelect;
