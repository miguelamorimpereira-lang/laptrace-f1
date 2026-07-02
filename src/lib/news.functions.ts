import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  source: string;
  image: string | null;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.autosport.com/rss/f1/news/", source: "Autosport" },
  { url: "https://www.motorsport.com/rss/f1/news/", source: "Motorsport.com" },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function firstString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return firstString(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("#text" in o) return firstString(o["#text"]);
  }
  return "";
}

function extractImage(item: Record<string, unknown>): string | null {
  const media = item["media:content"] ?? item["media:thumbnail"];
  if (media) {
    const m = Array.isArray(media) ? media[0] : media;
    const url = (m as Record<string, unknown>)?.["@_url"];
    if (typeof url === "string") return url;
  }
  const enclosure = item["enclosure"];
  if (enclosure) {
    const e = Array.isArray(enclosure) ? enclosure[0] : enclosure;
    const url = (e as Record<string, unknown>)?.["@_url"];
    if (typeof url === "string") return url;
  }
  return null;
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (LapTrace F1)" },
  });
  if (!res.ok) throw new Error(`Feed ${source} returned ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items
    .map((item: Record<string, unknown>): NewsItem => {
      const title = firstString(item.title).trim();
      const link = firstString(item.link).trim();
      const pub = firstString(item.pubDate).trim();
      return {
        title,
        link,
        pubDate: pub || null,
        source,
        image: extractImage(item),
      };
    })
    .filter((n) => n.title && n.link);
}

export const getLatestNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsItem[]> => {
    for (const feed of FEEDS) {
      try {
        const items = await fetchFeed(feed.url, feed.source);
        if (items.length > 0) return items.slice(0, 12);
      } catch {
        // Try the next feed.
      }
    }
    return [];
  },
);

export const latestNewsQuery = () =>
  queryOptions({
    queryKey: ["f1-news"],
    queryFn: () => getLatestNews(),
    staleTime: 15 * 60 * 1000,
    retry: false,
  });
