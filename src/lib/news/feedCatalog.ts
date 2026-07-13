import type { NewsFeedTopic, NewsTheater } from "@/lib/news/types";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import { DEFAULT_PACKAGE_SELECTION, type ViewPackageId } from "@/lib/viewPackages";

export type NewsFeedDef = {
  url: string;
  name: string;
  theater: NewsTheater;
  /** defense (default) | economy — geo-trader 전용 피드 */
  topic?: NewsFeedTopic;
  /** 경제 장르 — topic=economy 일 때 Intel 시트 카테고리 */
  econGenre?: EconomyNewsGenre;
  /** Skip theater keyword filter */
  unfiltered?: boolean;
};

const G = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const SHARED_DEFENSE: NewsFeedDef[] = [
  { url: "https://breakingdefense.com/feed/", name: "Breaking Defense", theater: "global" },
  { url: "https://www.longwarjournal.org/feed", name: "Long War Journal", theater: "global" },
  { url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml", name: "Military Times", theater: "global" },
  { url: "https://warontherocks.com/feed/", name: "War on the Rocks", theater: "global" },
  {
    url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10",
    name: "DoD",
    theater: "global",
    unfiltered: true,
  },
];

const MIDDLE_EAST: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", name: "BBC", theater: "middle-east", unfiltered: true },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml", name: "NYT", theater: "middle-east", unfiltered: true },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "middle-east" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "middle-east" },
  { url: "http://rss.cnn.com/rss/edition_meast.rss", name: "CNN", theater: "middle-east" },
  { url: "https://moxie.foxnews.com/google-publisher/world.xml", name: "Fox News", theater: "middle-east" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", name: "WSJ", theater: "middle-east" },
  { url: "https://www.timesofisrael.com/feed/", name: "Times of Israel", theater: "middle-east", unfiltered: true },
  { url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", name: "JPost", theater: "middle-east", unfiltered: true },
  { url: "https://www.ynetnews.com/Integration/StoryRss2.xml", name: "Ynet", theater: "middle-east", unfiltered: true },
  { url: "https://rcs.mako.co.il/rss/news-military.xml", name: "N12", theater: "middle-east", unfiltered: true },
  { url: "https://rss.walla.co.il/feed/22", name: "Walla", theater: "middle-east", unfiltered: true },
  { url: "https://www.haaretz.com/srv/middle-east-news-rss", name: "Haaretz", theater: "middle-east", unfiltered: true },
  { url: "https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml", name: "The National", theater: "middle-east" },
  { url: "https://www.dropsitenews.com/feed", name: "Drop Site", theater: "middle-east" },
  {
    url: "https://www.centcom.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=808&max=20",
    name: "CENTCOM",
    theater: "middle-east",
    unfiltered: true,
  },
  { url: "https://www.presstv.ir/rss.xml", name: "PressTV", theater: "middle-east", unfiltered: true },
  { url: G("Iran Israel war military strike"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G("Iran missile drone strike Israel"), name: "Google News", theater: "middle-east", unfiltered: true },
  { url: G('"Strait of Hormuz" OR "Red Sea" military Iran'), name: "Google News", theater: "middle-east", unfiltered: true },
];

const RUSSIA_UKRAINE: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", name: "BBC", theater: "russia-ukraine" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Europe.xml", name: "NYT", theater: "russia-ukraine" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", theater: "russia-ukraine" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "russia-ukraine" },
  { url: "https://kyivindependent.com/feed/", name: "Kyiv Independent", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.pravda.com.ua/eng/rss/", name: "Ukrainska Pravda", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.kyivpost.com/feed", name: "Kyiv Post", theater: "russia-ukraine", unfiltered: true },
  { url: "https://english.nv.ua/rss/all.xml", name: "NV", theater: "russia-ukraine", unfiltered: true },
  { url: "https://www.ukrinform.net/rss/block-lastnews", name: "Ukrinform", theater: "russia-ukraine", unfiltered: true },
  { url: "https://tass.com/rss/v2.xml", name: "TASS", theater: "russia-ukraine" },
  { url: "https://www.rt.com/rss/news/", name: "RT", theater: "russia-ukraine" },
  { url: "https://www.themoscowtimes.com/rss/news", name: "Moscow Times", theater: "russia-ukraine" },
  { url: "https://meduza.io/rss/en/all", name: "Meduza", theater: "russia-ukraine" },
  { url: G("Russia Ukraine war military"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine missile OR drone strike Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
  { url: G("Ukraine front line offensive Russia"), name: "Google News", theater: "russia-ukraine", unfiltered: true },
];

const CHINA_TAIWAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "china-taiwan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "china-taiwan" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "china-taiwan" },
  {
    url: G('(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")'),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("China Taiwan military strait tension"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
  {
    url: G("PLA Taiwan invasion exercise"),
    name: "Google News",
    theater: "china-taiwan",
    unfiltered: true,
  },
];

const KOREA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "korea" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "korea" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "korea" },
  {
    url: "https://www.yna.co.kr/rss/northkorea.xml",
    name: "연합뉴스 북한",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G(
      '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
    ),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
  {
    url: G("Korean peninsula DMZ tension military"),
    name: "Google News",
    theater: "korea",
    unfiltered: true,
  },
];

const JAPAN: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "japan" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "japan" },
  {
    url: G(
      '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
    ),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
  {
    url: G("Japan military Senkaku defense"),
    name: "Google News",
    theater: "japan",
    unfiltered: true,
  },
];

const SOUTH_ASIA: NewsFeedDef[] = [
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", name: "BBC", theater: "south-asia" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", name: "NYT", theater: "south-asia" },
  { url: "https://feeds.reuters.com/Reuters/worldNews", name: "Reuters", theater: "south-asia" },
  {
    url: G(
      '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
    ),
    name: "Google News · India",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G('("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)'),
    name: "Google News · LAC",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("India Pakistan military Kashmir conflict"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
  {
    url: G("Afghanistan Taliban military strike"),
    name: "Google News",
    theater: "south-asia",
    unfiltered: true,
  },
];

const SHARED_ECONOMY: NewsFeedDef[] = [
  // —— 시장 와이어 (속보 뼈대) ——
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    name: "Reuters Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain",
    name: "WSJ Markets",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
    name: "CNBC",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://www.ft.com/?format=rss",
    name: "Financial Times",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    name: "BBC Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
    name: "NYT Business",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },
  {
    url: "https://feeds.bloomberg.com/markets/news.rss",
    name: "Bloomberg Markets",
    theater: "global",
    topic: "economy",
    econGenre: "markets",
    unfiltered: true,
  },

  // —— AI · 빅테크 ——
  {
    url: G(
      '(Apple OR Microsoft OR Google OR Alphabet OR Amazon OR Meta OR "OpenAI" OR Netflix) (stock OR earnings OR revenue OR AI OR cloud OR antitrust)',
    ),
    name: "Google · Big Tech",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },
  {
    url: G(
      '("OpenAI" OR Anthropic OR "Google DeepMind" OR "Microsoft Copilot" OR ChatGPT OR "generative AI") (funding OR valuation OR partnership OR enterprise)',
    ),
    name: "Google · AI Labs",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },
  {
    url: G(
      '(Amazon OR AWS OR "Microsoft Azure" OR "Google Cloud" OR Oracle) (cloud OR "data center" OR capex OR AI)',
    ),
    name: "Google · Cloud Majors",
    theater: "global",
    topic: "economy",
    econGenre: "tech",
    unfiltered: true,
  },

  // —— 반도체 (엔비디아·파운드리·장비) ——
  {
    url: G(
      '(Nvidia OR TSMC OR ASML OR "SK hynix" OR Samsung OR Intel OR AMD OR Broadcom OR Qualcomm) (chip OR semiconductor OR GPU OR foundry OR earnings)',
    ),
    name: "Google · Chip Majors",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(Nvidia OR "Jensen Huang") (GPU OR AI OR "data center" OR Blackwell OR CUDA)',
    ),
    name: "Google · Nvidia",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(TSMC OR "Taiwan Semiconductor") (capacity OR fab OR Apple OR Nvidia OR "advanced node")',
    ),
    name: "Google · TSMC",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '(ASML OR "extreme ultraviolet" OR EUV) (lithography OR chip OR semiconductor)',
    ),
    name: "Google · ASML",
    theater: "global",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },
  {
    url: G(
      '("export control" OR "chip ban" OR "CHIPS Act") (China OR Huawei OR semiconductor OR Nvidia)',
    ),
    name: "Google · Chip Controls",
    theater: "china-taiwan",
    topic: "economy",
    econGenre: "chips",
    unfiltered: true,
  },

  // —— 전기차 · 모빌리티 · 배터리 ——
  {
    url: G(
      '(Tesla OR BYD OR Toyota OR Hyundai OR "Volkswagen" OR Rivian) (EV OR "electric vehicle" OR delivery OR earnings OR Autopilot)',
    ),
    name: "Google · EV Makers",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },
  {
    url: G(
      '(CATL OR Panasonic OR "LG Energy" OR "Samsung SDI" OR "solid-state battery") (battery OR EV OR gigafactory)',
    ),
    name: "Google · Batteries",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },
  {
    url: G(
      '(Tesla OR "Elon Musk") (stock OR Robotaxi OR Optimus OR energy OR Gigafactory)',
    ),
    name: "Google · Tesla",
    theater: "global",
    topic: "economy",
    econGenre: "auto",
    unfiltered: true,
  },

  // —— 에너지 메이저 ——
  {
    url: G(
      '("Exxon Mobil" OR ExxonMobil OR Chevron OR Shell OR BP OR TotalEnergies OR Aramco OR Equinor) (oil OR gas OR LNG OR earnings OR dividend)',
    ),
    name: "Google · Oil Majors",
    theater: "global",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },
  {
    url: G('"oil price" OR OPEC OR Brent OR WTI OR "natural gas" OR LNG'),
    name: "Google · Energy Prices",
    theater: "global",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },
  {
    url: G(
      '(Aramco OR ADNOC OR "QatarEnergy" OR "Petronas") (LNG OR oil OR investment OR IPO)',
    ),
    name: "Google · NOCs",
    theater: "middle-east",
    topic: "economy",
    econGenre: "energy",
    unfiltered: true,
  },

  // —— 해운 · 물류 기업 ——
  {
    url: G(
      '(Maersk OR "MSC" OR COSCO OR Hapag-Lloyd OR "Evergreen Marine" OR "HMM") (freight OR container OR shipping OR rate)',
    ),
    name: "Google · Shipping Lines",
    theater: "global",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },
  {
    url: G('"Red Sea" OR Suez OR Hormuz OR "shipping rates" OR "container freight" OR Baltic'),
    name: "Google · Freight Routes",
    theater: "middle-east",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },
  {
    url: G(
      '(FedEx OR UPS OR "DHL" OR "Amazon logistics") (shipping OR freight OR supply OR warehouse)',
    ),
    name: "Google · Logistics",
    theater: "global",
    topic: "economy",
    econGenre: "shipping",
    unfiltered: true,
  },

  // —— 인프라 · 광물 · 케이블 ——
  {
    url: G(
      '("critical minerals" OR "rare earth" OR lithium OR cobalt OR nickel) (mining OR China OR Australia OR investment)',
    ),
    name: "Google · Critical Minerals",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },
  {
    url: G(
      '("subsea cable" OR "undersea cable" OR "data center") (Google OR Microsoft OR Amazon OR Meta OR investment)',
    ),
    name: "Google · Cables · DC",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },
  {
    url: G(
      '("Belt and Road" OR BRI OR AIIB OR "port investment" OR "foreign direct investment") infrastructure',
    ),
    name: "Google · BRI · FDI",
    theater: "global",
    topic: "economy",
    econGenre: "infra",
    unfiltered: true,
  },

  // —— 거시·정책 (짧게) ——
  {
    url: G(
      'Fed OR ECB OR "Bank of Japan" OR "Federal Reserve" (rate OR hike OR cut OR inflation)',
    ),
    name: "Google · Central Banks",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: G(
      'sanctions OR tariff OR "trade war" OR "export control" OR WTO (China OR US OR EU)',
    ),
    name: "Google · Trade · Sanctions",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
  {
    url: "https://www.imf.org/en/News/RSS",
    name: "IMF News",
    theater: "global",
    topic: "economy",
    econGenre: "macro",
    unfiltered: true,
  },
];

/** 중앙아시아 — global 전장 Google 쿼리 (NewsTheater 별도 버킷 없음) */
const CENTRAL_ASIA_GOOGLE: NewsFeedDef[] = [
  {
    url: G('(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")'),
    name: "Google News · Central Asia",
    theater: "global",
    unfiltered: true,
  },
];

/** 지역별 주요 Google News RSS 쿼리 (문서·디버그용) */
export const GOOGLE_NEWS_QUERIES: Record<string, string> = {
  "china-taiwan": '(Taiwan OR "South China Sea") AND (military OR "PLA" OR "White House")',
  korea:
    '(North Korea OR Pyongyang) AND (missile OR nuclear OR "Kim Jong Un") AND (site:nknews.org OR site:dailynk.com OR site:yna.co.kr)',
  japan:
    '(Japan OR "Tokyo") AND (security OR defense OR "maritime") AND (site:kyodonews.net OR site:nikkei.com OR site:japantimes.co.jp)',
  "south-asia-india":
    '(India OR Modi) AND (geopolitics OR "foreign policy" OR security) AND (site:thehindu.com OR site:indianexpress.com)',
  "south-asia-lac": '("Line of Actual Control" OR India OR Pakistan) AND (border OR tension)',
  "central-asia": '(Central Asia) AND ("Great Game" OR "Geopolitics" OR "Security")',
  "economy-energy":
    '("Exxon Mobil" OR Chevron OR Shell OR Aramco OR OPEC OR Brent OR LNG)',
  "economy-macro":
    'Fed OR ECB OR sanctions OR tariff OR "trade war" OR inflation',
  "economy-shipping":
    '(Maersk OR COSCO OR "Red Sea" OR Suez OR Hormuz OR "shipping rates")',
  "economy-chips":
    '(Nvidia OR TSMC OR ASML OR Samsung OR "SK hynix" OR Intel OR AMD) (chip OR semiconductor OR GPU)',
  "economy-tech":
    '(Apple OR Microsoft OR Google OR Amazon OR Meta OR OpenAI) (stock OR AI OR cloud OR earnings)',
  "economy-auto":
    '(Tesla OR BYD OR Toyota OR Hyundai OR CATL) (EV OR battery OR earnings)',
  "economy-infra-critical":
    '("critical minerals" OR "rare earth" OR "subsea cable" OR "data center") investment',
  "economy-infra-bri":
    '"Belt and Road" OR BRI OR AIIB OR "port investment" OR FDI',
};

export const ECON_RELEVANCE =
  /oil|gas|lng|opec|brent|wti|crude|sanction|tariff|trade|fed|ecb|rate|inflation|gdp|recession|supply\s?chain|shipping|freight|container|hormuz|suez|red\s?sea|semiconductor|chip|gpu|nvidia|tsmc|asml|samsung|hynix|intel|amd|broadcom|qualcomm|apple|microsoft|google|alphabet|amazon|meta|openai|anthropic|tesla|byd|toyota|hyundai|catl|exxon|chevron|shell|aramco|bp|totalenergies|maersk|cosco|hapag|fedex|ups|datacenter|data\s?center|cloud|aws|azure|market|stocks|earnings|bond|dollar|yuan|yen|euro|commodit|energy|pipeline|bank|currency|imf|wto|export|import|port\b|vix|infrastructure|bri\b|belt\s?and\s?road|aiib|world\s?bank|adb\b|fdi|foreign\s?direct|critical\s?mineral|rare\s?earth|lithium|cobalt|subsea|undersea\s?cable|rail\s?corridor|power\s?grid|chips?\s?act|foundry|euv|gigafactory|ev\b|electric\s?vehicle|battery|sovereign\s?debt|fiscal|oecd|antitrust|capex/i;

export const THEATER_RELEVANCE: Record<NewsTheater, RegExp> = {
  "middle-east":
    /iran|israel|idf|irgc|hezbollah|hamas|houthi|lebanon|gaza|tehran|tel\s?aviv|jerusalem|yemen|iraq|syria|gulf|hormuz|red\s?sea|missile|strike|nuclear|centcom|middle\s?east|west\s?bank|golan|khamenei|netanyahu|drone|saudi|emirates|uae|gcc/i,
  "russia-ukraine":
    /ukrain|russia|russian|putin|zelensky|kyiv|kharkiv|odesa|dnipro|donbas|crimea|sevastopol|kremlin|moscow|belgorod|wagner|himars|atacms|shahed/i,
  "china-taiwan":
    /china|taiwan|taipei|beijing|pla|strait|senkaku|diaoyu|south\s?china\s?sea|xi\s?jinping|cross[\s-]?strait|kinmen/i,
  korea:
    /north\s?korea|south\s?korea|pyongyang|seoul|dmz|dprk|kim\s?jong|korean\s?peninsula|icbm|ballistic/i,
  japan:
    /japan|tokyo|okinawa|senkaku|self[\s-]?defense\s?force|sdf|yasukuni|north\s?korea\s?japan/i,
  "south-asia":
    /india|pakistan|kashmir|afghanistan|taliban|myanmar|bangladesh|sri\s?lanka|nepal|modi|rawalpindi|line\s?of\s?actual\s?control|lac\b|central\s?asia|kazakh|uzbek|turkmen|kyrgyz|tajik/i,
  global: /military|defense|war|conflict|strike|missile|pentagon|nato|sanction|geopolitic|great\s?game|central\s?asia/i,
};

const NOISE =
  /world.?cup|\bfifa\b|\bioc\b|olympic|premier.?league|champions.?league|super.?bowl|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|grammy|oscar|\bemmy|box.?office|celebrity|eurovision/i;

export const ALL_NEWS_FEEDS: NewsFeedDef[] = dedupeFeedsByUrl([
  ...MIDDLE_EAST,
  ...RUSSIA_UKRAINE,
  ...CHINA_TAIWAN,
  ...KOREA,
  ...JAPAN,
  ...SOUTH_ASIA,
  ...CENTRAL_ASIA_GOOGLE,
  ...SHARED_DEFENSE,
]);

export const ALL_ECON_FEEDS: NewsFeedDef[] = dedupeFeedsByUrl(SHARED_ECONOMY);

function dedupeFeedsByUrl(feeds: NewsFeedDef[]): NewsFeedDef[] {
  const seen = new Set<string>();
  return feeds.filter((feed) => {
    if (seen.has(feed.url)) return false;
    seen.add(feed.url);
    return true;
  });
}

/** view 패키지에 따라 defense / economy RSS 목록 선택 */
export function feedsForPackages(packages: ViewPackageId[]): NewsFeedDef[] {
  const ids = packages.length > 0 ? packages : DEFAULT_PACKAGE_SELECTION;
  const wantEcon = ids.includes("geo-trader");
  const wantDefense = ids.some((id) => id !== "geo-trader") || ids.length > 1;

  const merged: NewsFeedDef[] = [];
  if (wantDefense) merged.push(...ALL_NEWS_FEEDS);
  if (wantEcon) merged.push(...ALL_ECON_FEEDS);
  return dedupeFeedsByUrl(merged);
}

export function isEconomyNewsMode(packages: ViewPackageId[]): boolean {
  const ids = packages.filter((id) => id !== "custom");
  return ids.length > 0 && ids.every((id) => id === "geo-trader");
}

export function isFeedItemRelevant(
  title: string,
  category: string | undefined,
  feed: NewsFeedDef,
): boolean {
  if (NOISE.test(title)) return false;
  if (feed.unfiltered) return true;
  const blob = `${title} ${category || ""}`;
  if (feed.topic === "economy") return ECON_RELEVANCE.test(blob);
  return THEATER_RELEVANCE[feed.theater].test(blob);
}
