# Audio assets (`public/audio`)

사운드 지휘소: [`src/data/audioManifest.ts`](../../src/data/audioManifest.ts)  
스트림 API: `GET /api/sound-stream?eventId=…`  
클라우드: `npm run cf:r2:upload:audio` → R2 `audio/*` · `NEXT_PUBLIC_DATA_CDN` 우선

## 로컬 파일 (전투 · 공습)

`localSrc`가 있으면 Freesound를 **완전히 우회**합니다. (텍스트 검색 오매칭·개 짖는 소리 등 방지)

### 공습
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `air-attack-siren.mp3` | `tzeva-red-alert` · `tzeva-all-clear` · `neptun-air-alert` | 이스라엘 / 우크라 공습 사이렌 (칩·버튼 fly 전용) |

### 전장
| 파일 | 이벤트 | 용도 |
|------|--------|------|
| `combat-firefight-distant.mp3` | `frontline-gunfire` · `gdelt-war-sting` | [FS#404334](https://freesound.org/s/404334/) Firefight · 원거리 MG/박격포 |
| `combat-mg-distant-smg.mp3` | `frontline-gunfire-distant-auto` | [FS#417690](https://freesound.org/s/417690/) distant SMG 연사 |
| `combat-mlrs.wav` | `frontline-mlrs` | 다련장 |
| `combat-frontline-bed.wav` | `frontline-artillery-ambient` | 전선 rumble 루프 |

> 폭격·원거리 폭발·탄도·포격은 Freesound ID 고정 (로컬 wav 우회). 전선 총격은 위 **두 원거리 샘플** (CC0).

---

## 큐레이션 Freesound ID

`freesoundId` 고정 · ID 실패 시에만 `freesoundQuery` 검색 폴백.  
필요: `.env.local`의 `FREESOUND_API_KEY`.

### 지정학 · 전장 · 긴장
| Event ID | FS ID | 설명 |
|----------|-------|------|
| `neptun-impact` / `firms-combat-burst` | [741267](https://freesound.org/s/741267/) | 원거리 미사일 폭발 (CC0) |
| `frontline-bombing` | [161806](https://freesound.org/s/161806/) | 미사일 스트라이크 리믹스 (BY-NC) |
| `frontline-artillery-shot` | [486039](https://freesound.org/s/486039/) | 건물 안 포격음 (CC0) |
| `frontline-fpv-drone` | [854466](https://freesound.org/s/854466/) | FPV 드론 · 저음량 파도→컷→폭발 (CC0) |
| `frontline-fpv-detonation` | [840902](https://freesound.org/s/840902/) | FPV 컷 직후 박격포 bang (BY 4.0) |
| `neptun-ballistic` | [719426](https://freesound.org/s/719426/) | 진입 whoosh + 폭발 (CC0) |
| `firms-exercise` | [612277](https://freesound.org/s/612277/) | big fire loop (BY-NC) |
| `taiwan-strait-tension` | [264065](https://freesound.org/s/264065/) | 대만해협 시계 틱 긴장 (CC0) |
| `hero-breaking` | [395815](https://freesound.org/s/395815/) | A급 속보 타전 · SOS Morse (BY 4.0) |
| `dispute-tension-high` | 593785 | 한반도/고긴장 rumble (루프) |
| `carrier-deck-ambient` | 162449 | 항모 갑판 앰비언스 (루프) |
| `neptun-uav-flyby` | 854382 | UAV 프로펠러 |
| `gdelt-protest-sting` | 360758 | 먼 시위 군중 |
| `cyber-incident` | 423166 | 디지털 UI 에러 톤 |
| `telegram-live-burst` | 524205 | 무전 스퀠치 |
| `firms-wildfire-crackle` | 620324 | 잔불/캠프파이어 |

### 경제
| Event ID | FS ID | 설명 |
|----------|-------|------|
| `port-ambient` | 254130 | 항구 앰비언스 (루프) |
| `construction-ambient` | [159470](https://freesound.org/s/159470/) | 경제중심 distant ambience (루프) |
| `pipeline-hum` | 453514 | 파이프/펌프 허밍 (루프) |
| `datacenter-hum` | 610761 | 서버룸 팬 (루프) |
| `ticker-spike` | 380490 | NYSE 벨 |
| `vix-spike` | [369880](https://freesound.org/s/369880/) | 알람 비프 · VIX 경고 |
| `oil-spike` | 234782 | 스팀/압력 히스 |
| `sanctions-stamp` | 470710 | 도장 |
| `economy-alert` | 571511 | 소프트 LowDing |

### UI (매니페스트 예약 · 자동 UI 클릭음은 비활성)
| Event ID | FS ID |
|----------|-------|
| `flyto-arrive` | 833599 |
| `mode-switch` / `ui-click` | 458586 |
| `boot-ready` | 413749 |
| `panel-open` | 419493 |
| `load-error` | 423169 |
| `stream-disconnect` | 524205 |
| `parchment-unfold` | [360646](https://freesound.org/s/360646/) · 종이 펼침 |
| `parchment-fold` | [234886](https://freesound.org/s/234886/) · 접기(초반 컷) |
| `parchment-flyaway` | 833599 · 날아가는 whoosh |

---

## 재생 우선순위 (앰비언트)

/** 지정학: 전선(LOD 풀) → 대만해협 틱 → 긴장 rumble → 항모 갑판  
 * 전선 LOD: regional=포격/짧은폭격 · near=포격+작은총성 · village=총성 위주 */

**지경학:** 파이프라인 → 데이터센터 → 항구 → 경제중심  

체크박스만 켠다고 소리가 나지 않습니다. 카메라가 해당 지역·이벤트에 들어오거나, 공습은 **버튼 fly** 때만 재생됩니다. 상세는 루트 [`README.md`](../../README.md) 「사운드 시스템」.
