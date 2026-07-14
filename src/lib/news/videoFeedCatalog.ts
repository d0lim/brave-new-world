import type { VideoNewsTopic } from "@/lib/news/videoTypes";
import type { ViewPackageId } from "@/lib/viewPackages";
import { isEconomyNewsMode } from "@/lib/news/feedCatalog";

export type VideoFeedDef = {
  channelId: string;
  name: string;
  topic: VideoNewsTopic;
};

/** 지정학 — 국제·안보 방송 YouTube (공개 Atom, API 키 불필요) */
export const DEFENSE_VIDEO_FEEDS: VideoFeedDef[] = [
  { channelId: "UC16niRr50-MSBwiO3YDb3RA", name: "BBC News", topic: "defense" },
  { channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", name: "Al Jazeera English", topic: "defense" },
  { channelId: "UCknLrEdhRCp1aegoMqRaCZg", name: "DW News", topic: "defense" },
  { channelId: "UCQfwfsi5VrQ8yKZ-UWmYLbA", name: "France 24", topic: "defense" },
  { channelId: "UCoMdktPfjR4d1kv5HVBCXOw", name: "Sky News", topic: "defense" },
];

/** 지경학 — 시장·매크로 방송 */
export const ECONOMY_VIDEO_FEEDS: VideoFeedDef[] = [
  { channelId: "UCAL_4Ls5qWRfXXNlpUM9zwQ", name: "Bloomberg Television", topic: "economy" },
  { channelId: "UCvJJ_dzjViJCoYgQtZLE2tg", name: "CNBC Television", topic: "economy" },
  { channelId: "UCEApe0dHxbjC8mUOGb6YeWw", name: "Yahoo Finance", topic: "economy" },
  { channelId: "UCK7tptUFHhAagtB3azZXNtw", name: "Bloomberg Quicktake", topic: "economy" },
  { channelId: "UCkJdamoRox6SCbVK5s0CQsA", name: "Wall Street Journal", topic: "economy" },
];

export function youtubeAtomUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

export function videoTopicForPackages(packages?: ViewPackageId[]): VideoNewsTopic {
  return isEconomyNewsMode(packages ?? []) ? "economy" : "defense";
}

export function feedsForVideoTopic(topic: VideoNewsTopic): VideoFeedDef[] {
  return topic === "economy" ? ECONOMY_VIDEO_FEEDS : DEFENSE_VIDEO_FEEDS;
}
