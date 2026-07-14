import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://statisticsoftheworld.com";

/** Common countryHint strings → ISO3 for SOTW */
const COUNTRY_ISO3: Record<string, string> = {
  iran: "IRN",
  egypt: "EGY",
  yemen: "YEM",
  singapore: "SGP",
  malaysia: "MYS",
  taiwan: "TWN",
  panama: "PAN",
  "united arab emirates": "ARE",
  uae: "ARE",
  qatar: "QAT",
  netherlands: "NLD",
  "united states": "USA",
  "united kingdom": "GBR",
  "hong kong": "HKG",
  "south korea": "KOR",
  korea: "KOR",
  japan: "JPN",
  vietnam: "VNM",
  indonesia: "IDN",
  germany: "DEU",
  china: "CHN",
  ukraine: "UKR",
  australia: "AUS",
  chile: "CHL",
};

function pickIndicator(
  indicators: Array<{ id?: string; value?: number | null }> | undefined,
  ids: string[],
): number | null {
  if (!indicators?.length) return null;
  for (const id of ids) {
    const hit = indicators.find((row) => row.id === id);
    if (hit && typeof hit.value === "number" && Number.isFinite(hit.value)) return hit.value;
  }
  return null;
}

export async function GET(request: Request) {
  const apiKey = process.env.STATSOFTHEWORLD_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ disabled: true, reason: "STATSOFTHEWORLD_API_KEY not set" });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();
  if (!country) {
    return NextResponse.json({ error: "country query required" }, { status: 400 });
  }

  const iso =
    COUNTRY_ISO3[country.toLowerCase()] ??
    (country.length === 3 ? country.toUpperCase() : null);

  if (!iso) {
    return NextResponse.json({
      disabled: false,
      name: country,
      error: "unmapped country hint",
      gdpUsd: null,
      tradePctGdp: null,
      population: null,
    });
  }

  try {
    const res = await fetch(`${BASE}/api/v1/countries/${encodeURIComponent(iso)}`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          name: country,
          error: `upstream ${res.status}`,
          gdpUsd: null,
          tradePctGdp: null,
          population: null,
        },
        { status: 502 },
      );
    }

    const payload = (await res.json()) as {
      country?: { id?: string; name?: string };
      indicators?: Array<{ id?: string; value?: number | null }>;
    };

    const indicators = payload.indicators;
    return NextResponse.json({
      disabled: false,
      id: payload.country?.id ?? iso,
      name: payload.country?.name ?? country,
      gdpUsd: pickIndicator(indicators, ["IMF.NGDPD", "NY.GDP.MKTP.CD", "GDP"]),
      tradePctGdp: pickIndicator(indicators, ["NE.TRD.GNFS.ZS", "TRADE.PCT.GDP"]),
      population: pickIndicator(indicators, ["SP.POP.TOTL", "LP", "POP"]),
      attribution: "Statistics of the World",
    });
  } catch (error) {
    return NextResponse.json(
      {
        name: country,
        error: error instanceof Error ? error.message : "world-stats failed",
        gdpUsd: null,
        tradePctGdp: null,
        population: null,
      },
      { status: 502 },
    );
  }
}
