import type { NormalizedContentItem } from "@/lib/domain/types";
import { scoreEnterpriseRelevance } from "@/lib/content-sources/shared";

type HackerNewsStory = {
  id?: number;
  type?: string;
  title?: string;
  url?: string;
  time?: number;
  score?: number;
  descendants?: number;
  deleted?: boolean;
  dead?: boolean;
};

export function normalizeHackerNewsItem(raw: HackerNewsStory): NormalizedContentItem | null {
  if (!raw.id || raw.type !== "story" || raw.deleted || raw.dead || !raw.title) return null;

  return {
    externalId: String(raw.id),
    title: raw.title.trim(),
    url: raw.url || `https://news.ycombinator.com/item?id=${raw.id}`,
    summary: `Hacker News discussion: ${raw.score ?? 0} points, ${raw.descendants ?? 0} comments.`,
    source: "Hacker News",
    category: "practitioner-discussion",
    tags: ["community-feedback"],
    publishedAt: new Date((raw.time ?? 0) * 1000).toISOString(),
    contentHash: `hacker-news:${raw.id}`
  };
}

export async function fetchHackerNewsItems(options: {
  fetcher?: typeof fetch;
  limit?: number;
  scanLimit?: number;
} = {}): Promise<NormalizedContentItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!response.ok) throw new Error(`Hacker News top stories request failed with ${response.status}`);

  const ids = ((await response.json()) as number[]).slice(0, options.scanLimit ?? 60);
  const stories = await Promise.allSettled(
    ids.map(async (id) => {
      const itemResponse = await fetcher(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!itemResponse.ok) return null;
      return normalizeHackerNewsItem((await itemResponse.json()) as HackerNewsStory);
    })
  );

  return stories
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((left, right) => scoreHackerNewsCandidate(right) - scoreHackerNewsCandidate(left))
    .slice(0, options.limit ?? 15);
}

function scoreHackerNewsCandidate(item: NormalizedContentItem): number {
  const publishedAt = new Date(item.publishedAt).getTime();
  const freshness = Number.isFinite(publishedAt) ? publishedAt / 1_000_000_000_000 : 0;
  return scoreEnterpriseRelevance(item) * 100 + freshness;
}
