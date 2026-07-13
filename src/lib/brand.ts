/** 사용자-facing 브랜드. 인프라 식별자(conflict-view, geowatch-*)는 유지. */
export const BRAND_NAME = {
  ko: "멋진 신세계",
  en: "Brave New World",
} as const;

export const BRAND_MOTIF = {
  ko: "Aldous Huxley · Brave New World",
  en: "After Aldous Huxley",
} as const;

export const BRAND_TAGLINE = {
  ko: "한쪽에서는 포화가 울리고, 다른 쪽에서는 누군가가 돈을 번다",
  en: "Shells on one shore. Fortunes on the other.",
} as const;

export function brandName(lang: "ko" | "en"): string {
  return BRAND_NAME[lang];
}
