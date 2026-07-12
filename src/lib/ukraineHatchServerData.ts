import fs from "fs";
import path from "path";
import type { UkraineHatchCachePayload, UkraineHatchLod } from "@/lib/ukraineHatchPrecompute";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

function hatchDir(profile: DataProfile) {
  return path.join(process.cwd(), "private", "viina-render", profile);
}

function hatchFile(profile: DataProfile, lod: UkraineHatchLod) {
  return path.join(hatchDir(profile), `ukraine-hatch-paths-${lod}.json`);
}

export function loadUkraineHatchCache(
  lod: UkraineHatchLod,
  profile?: DataProfile,
): UkraineHatchCachePayload | null {
  const resolved = profile ?? getServerDataProfile();
  const filePath = hatchFile(resolved, lod);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as UkraineHatchCachePayload;
    if (!Array.isArray(raw.paths) || raw.paths.length === 0) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveUkraineHatchCache(
  payload: UkraineHatchCachePayload,
  profile?: DataProfile,
) {
  const resolved = profile ?? getServerDataProfile();
  const dir = hatchDir(resolved);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = hatchFile(resolved, payload.lodTier);
  fs.writeFileSync(filePath, JSON.stringify(payload));
  return filePath;
}

export function ukraineHatchCacheMeta(profile?: DataProfile) {
  const resolved = profile ?? getServerDataProfile();
  const overview = loadUkraineHatchCache("overview", resolved);
  const detail = loadUkraineHatchCache("detail", resolved);
  return {
    overview: overview
      ? { pathCount: overview.pathCount, controlDate: overview.controlDate, generatedAt: overview.generatedAt }
      : null,
    detail: detail
      ? { pathCount: detail.pathCount, controlDate: detail.controlDate, generatedAt: detail.generatedAt }
      : null,
  };
}
