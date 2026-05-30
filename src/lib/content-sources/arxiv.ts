import { XMLParser } from "fast-xml-parser";
import type { NormalizedContentItem } from "@/lib/domain/types";
import { dedupeContentItems, stripMarkup, stringValue } from "@/lib/content-sources/shared";

type ArxivRssItem = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  guid?: unknown;
  pubDate?: unknown;
};

const ARXIV_CATEGORIES = ["cs.AI", "cs.LG", "cs.CL"];

export function parseArxivRss(xml: string): NormalizedContentItem[] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as {
    rss?: { channel?: { item?: ArxivRssItem | ArxivRssItem[] } };
  };
  const rawItems = parsed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return dedupeContentItems(
    items.map((raw) => {
      const guid = xmlValue(raw.guid) || stringValue(raw.link);
      return {
        externalId: guid,
        title: stripMarkup(raw.title) || "Untitled arXiv paper",
        url: stringValue(raw.link),
        summary: stripMarkup(raw.description),
        source: "arXiv",
        category: "research-trend",
        tags: ["research"],
        publishedAt: safeIsoDate(raw.pubDate),
        contentHash: `arxiv:${guid}`
      };
    })
  );
}

export async function fetchArxivRssItems(options: {
  fetcher?: typeof fetch;
  limit?: number;
} = {}): Promise<NormalizedContentItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const responses = await Promise.allSettled(
    ARXIV_CATEGORIES.map(async (category) => {
      const response = await fetcher(`https://rss.arxiv.org/rss/${category}`);
      if (!response.ok) throw new Error(`arXiv ${category} RSS request failed with ${response.status}`);
      return parseArxivRss(await response.text());
    })
  );
  const items = responses.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (!items.length && responses.every((result) => result.status === "rejected")) {
    throw new Error("arXiv RSS requests failed");
  }
  return dedupeContentItems(items).slice(0, options.limit ?? 12);
}

function xmlValue(value: unknown): string {
  if (value && typeof value === "object" && "#text" in value) {
    return stringValue((value as { "#text"?: unknown })["#text"]);
  }
  return stringValue(value);
}

function safeIsoDate(value: unknown): string {
  const date = new Date(stringValue(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

