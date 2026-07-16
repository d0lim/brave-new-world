/**
 * 전장별 사상자 마커 좌표·시드 (우크라는 Mediazona 라이브로 덮어씀).
 * 지정학 지구본 — 영토 고정 좌표에 사망/부상 오버레이.
 */

import type { CombatTheaterId } from "@/lib/theaterCombat";

export type TheaterCasualtySeed = {
  theaterId: CombatTheaterId;
  lat: number;
  lng: number;
  killed: number;
  wounded: number;
  asOf: string;
  sourceHintKo: string;
  sourceHintEn: string;
  woundedNoteKo?: string;
  woundedNoteEn?: string;
};

/** 우크라이나 지리 중심 — 사용자 지정 좌표 */
export const UKRAINE_CASUALTY_MARKER = {
  lat: 48.3794,
  lng: 31.1656,
} as const;

export const THEATER_CASUALTY_SEEDS: TheaterCasualtySeed[] = [
  {
    theaterId: "russia-ukraine",
    ...UKRAINE_CASUALTY_MARKER,
    killed: 0,
    wounded: 0,
    asOf: "",
    sourceHintKo: "Mediazona × BBC · CSIS WIA est.",
    sourceHintEn: "Mediazona × BBC · CSIS WIA est.",
    woundedNoteKo: "부상은 특정 고정 추정치입니다. (명의 확인 목록 없음 · CSIS)",
    woundedNoteEn: "Wounded is a fixed estimate (no named list · CSIS).",
  },
  {
    theaterId: "middle-east",
    lat: 29.2,
    lng: 42.5,
    killed: 62_400,
    wounded: 148_000,
    asOf: "2026-06",
    sourceHintKo: "UN OCHA · ACLED regional est.",
    sourceHintEn: "UN OCHA · ACLED regional est.",
    woundedNoteKo: "부상은 공개 추정치입니다. (명의 확인 목록 없음)",
    woundedNoteEn: "Wounded is a public estimate (no named list).",
  },
  {
    theaterId: "china-taiwan",
    lat: 24.2,
    lng: 119.2,
    killed: 0,
    wounded: 0,
    asOf: "2026-07",
    sourceHintKo: "긴장 구간 · 개전 전",
    sourceHintEn: "Tension theater · no active war",
    woundedNoteKo: "개전 전 긴장 구간 — 누적 교전 사상자 집계 없음",
    woundedNoteEn: "Pre-war tension zone — no cumulative combat casualty tally",
  },
  {
    theaterId: "korea",
    lat: 38.0,
    lng: 127.3,
    killed: 0,
    wounded: 0,
    asOf: "2026-07",
    sourceHintKo: "긴장 구간 · 개전 전",
    sourceHintEn: "Tension theater · no active war",
    woundedNoteKo: "개전 전 긴장 구간 — 누적 교전 사상자 집계 없음",
    woundedNoteEn: "Pre-war tension zone — no cumulative combat casualty tally",
  },
];

export function getTheaterCasualtySeed(theaterId: CombatTheaterId): TheaterCasualtySeed | undefined {
  return THEATER_CASUALTY_SEEDS.find((s) => s.theaterId === theaterId);
}
