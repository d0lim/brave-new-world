# Reference assets

## `us-carrier-deck-aerial.png`

US Navy 항공모함 **공중俯視** 참조 사진입니다.

- 지도 마커 실루엣: `src/data/usCarrierDeckSilhouette.ts`
- SVG: `src/lib/usCarrierDeckIcon.ts`

## 수상전투함 (구축·호위·초계·순양 통합)

| 파일 | 내용 |
|------|------|
| `rok-ddg-surface-combatant-aerial.png` | 주 참조 (세종대왕급 공중샷) |
| `rok-ddg-sejong-aerial.png` | 세종대왕급 보조 |
| `us-ddg-arleigh-burke-aerial.png` | 알레이버크급 보조 |

- geometry: `src/data/surfaceCombatantSilhouette.ts`
- SVG: `src/lib/surfaceCombatantDeckIcon.ts`
- 마커: `src/lib/aisVesselMarkers.ts` (`isAisSurfaceCombatant`)

## 잠수함

| 파일 | 내용 |
|------|------|
| `submarine-underwater-aerial.png` | 수중 시가형 헐 주 참조 |
| `submarine-torpedo-quarter.png` | 3/4·어뢰 발사 보조 |

- geometry: `src/data/submarineSilhouette.ts`
- SVG: `src/lib/submarineDeckIcon.ts`
- 마커: `isAisAspectHullMarker` (submarine)
