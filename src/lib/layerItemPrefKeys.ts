import type { LayerPrefs } from "@/lib/layerPrefs";

/** LayerCategoryPanel item id → LayerPrefs boolean/string key */
export const LAYER_ITEM_PREF_KEYS: Partial<Record<string, keyof LayerPrefs>> = {
  "city-labels": "showCityLabels",
  rail: "showRailGlow",
  ukraine: "showUkraineControl",
  neptun: "showNeptun",
  disputes: "showWarZones",
  "war-zones": "showWarZones",
  "diplomatic-tension": "showDiplomaticTension",
  "conflict-zones": "showConflictZones",
  "arms-embargo": "showArmsEmbargo",
  ucdp: "showUcdpEvents",
  "gdelt-war": "showGdeltWar",
  "gdelt-diplomatic": "showGdeltDiplomatic",
  "gdelt-alliance": "showGdeltAlliance",
  "gdelt-protest": "showGdeltProtests",
  "gdelt-ocean": "showGdeltOceanCompetition",
  "telegram-osint": "showTelegramOsint",
  "tzeva-adom": "showTzevaAdom",
  "newfeeds-iran": "showNewfeedsIranAttacks",
  "china-taiwan-incidents": "showChinaTaiwanIncidents",
  "china-japan-incidents": "showChinaJapanIncidents",
  "china-philippines-incidents": "showChinaPhilippinesIncidents",
  "us-china-incidents": "showUsChinaIncidents",
  "nk-missile-tests": "showNorthKoreaMissileTests",
  "oil-pipelines": "showOilPipelines",
  "gas-pipelines": "showGasPipelines",
  "lng-terminals": "showLngTerminals",
  "gem-coal-plants": "showGemCoalPlants",
  "gem-coal-mines": "showGemCoalMines",
  "gem-coal-terminals": "showGemCoalTerminals",
  "gem-nuclear": "showGemNuclear",
  "gem-solar": "showGemSolar",
  "gem-wind": "showGemWind",
  "gem-hydro": "showGemHydro",
  "gem-geothermal": "showGemGeothermal",
  "gem-bioenergy": "showGemBioenergy",
  "gem-oil-gas-plants": "showGemOilGasPlants",
  "gem-oil-gas-extraction": "showGemOilGasExtraction",
  "gem-iron-ore": "showGemIronOre",
  "gem-cement": "showGemCement",
  "gem-steel": "showGemSteel",
  "gem-chemicals": "showGemChemicals",
  resources: "showResources",
  nuclear: "showNuclearSites",
  shipping: "showShippingLanes",
  "bri-trade": "showBriTradeConnectivity",
  "us-dfc-supply": "showUsDfcSupplyChain",
  cables: "showSubmarineCables",
  tunnels: "showSubmarineTunnels",
  airports: "showAirports",
  ports: "showPorts",
  ixp: "showInternetExchanges",
  "logistics-risk": "showLogisticsRisk",
  "critical-nodes": "showCriticalNodes",
  ais: "showAis",
  "military-bases": "showMilitaryBases",
  "military-air": "showMilitaryActivity",
  "air-traffic": "showAirTraffic",
  intel: "showIntelHotspots",
  refugee: "showRefugeeCamps",
  firms: "showFirmsFires",
  cyber: "showCyberIncidents",
  election: "showElectionEvents",
  space: "showSpaceLaunches",
  economic: "showEconomicCenters",
  "ai-dc": "showAiDataCenters",
  sanctions: "showSanctionsEntities",
  "east-asia-adiz": "showEastAsiaAdiz",
  "axis-network": "showAxisNetwork",
};

export function patchFromCategoryItems(
  items: Array<{ id: string; options?: Array<{ id: string }> }>,
  enabled: boolean,
): Partial<LayerPrefs> {
  const patch: Partial<LayerPrefs> = {};
  for (const item of items) {
    if (item.options?.length) {
      for (const opt of item.options) {
        const key = LAYER_ITEM_PREF_KEYS[opt.id];
        if (key) (patch as Record<string, boolean>)[key] = enabled;
      }
      continue;
    }
    const key = LAYER_ITEM_PREF_KEYS[item.id];
    if (key) {
      (patch as Record<string, boolean>)[key] = enabled;
    }
  }
  return patch;
}
