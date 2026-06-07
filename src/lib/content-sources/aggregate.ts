import { fetchAihotWithFallback } from "@/lib/aihot";
import { fetchArxivRssItems } from "@/lib/content-sources/arxiv";
import { fetchGithubReleaseItems } from "@/lib/content-sources/github-releases";
import { fetchHackerNewsItems } from "@/lib/content-sources/hacker-news";
import { fetchHuggingFaceDailyPapers } from "@/lib/content-sources/hugging-face";
import {
  compressEnterpriseCandidates,
  dedupeContentItems,
  filterItemsWithinHours,
  normalizeUrlKey
} from "@/lib/content-sources/shared";
import type { NormalizedContentItem, SourceWindow } from "@/lib/domain/types";

export type ContentSourceId = "aihot" | "hacker-news" | "hugging-face" | "arxiv" | "github-releases";

type ContentSourceOutput =
  | NormalizedContentItem[]
  | { items: NormalizedContentItem[]; sourceWindow?: SourceWindow };

export type ContentSourceCollector = {
  id: ContentSourceId;
  label: string;
  collect: (now: Date) => Promise<ContentSourceOutput>;
};

export type ContentSourceProgressEvent = {
  id: ContentSourceId | "aggregate";
  label: string;
  status: "running" | "success" | "error";
  count?: number;
  detail?: string;
};

export type ContentSourceStat = {
  id: ContentSourceId;
  label: string;
  count: number;
};

const SOURCE_ITEM_LIMIT = 20;
const SOURCE_MIN_CANDIDATES = 5;

export async function collectEnterpriseAiCandidates(options: {
  now?: Date;
  limit?: number;
  excludedUrls?: string[];
  collectors?: ContentSourceCollector[];
  onProgress?: (event: ContentSourceProgressEvent) => void;
} = {}): Promise<{
  sourceWindow: SourceWindow;
  items: NormalizedContentItem[];
  failures: Array<{ id: ContentSourceId; label: string; error: string }>;
  sourceStats: ContentSourceStat[];
  excludedPreviousUrls: string[];
}> {
  const now = options.now ?? new Date();
  const collectors = options.collectors ?? createDefaultCollectors();
  const settled = await Promise.allSettled(
    collectors.map(async (collector) => {
      options.onProgress?.({ id: collector.id, label: collector.label, status: "running" });
      try {
        const output = await collector.collect(now);
        const normalized = Array.isArray(output) ? { items: output } : output;
        const recentItems = selectSourceCandidates(normalized.items, now);
        options.onProgress?.({
          id: collector.id,
          label: collector.label,
          status: "success",
          count: recentItems.length
        });
        return { collector, ...normalized, items: recentItems };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        options.onProgress?.({ id: collector.id, label: collector.label, status: "error", detail });
        throw { collector, detail };
      }
    })
  );

  const successes = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failures = settled.flatMap((result) =>
    result.status === "rejected"
      ? [
          {
            id: result.reason.collector.id as ContentSourceId,
            label: result.reason.collector.label as string,
            error: result.reason.detail as string
          }
        ]
      : []
  );
  if (!successes.length) throw new Error("No content sources are currently available");

  const merged = dedupeContentItems(successes.flatMap((result) => result.items));
  const excludedUrlKeys = new Set((options.excludedUrls ?? []).map(normalizeUrlKey).filter(Boolean));
  const withoutPrevious = merged.filter((item) => !excludedUrlKeys.has(normalizeUrlKey(item.url)));
  const preferred = withoutPrevious.length ? withoutPrevious : merged;
  const excludedPreviousUrls = withoutPrevious.length
    ? merged.filter((item) => excludedUrlKeys.has(normalizeUrlKey(item.url))).map((item) => item.url)
    : [];
  options.onProgress?.({
    id: "aggregate",
    label: "Source aggregator",
    status: "success",
    count: preferred.length,
    detail: excludedPreviousUrls.length
      ? `Merged, deduplicated and excluded ${excludedPreviousUrls.length} previous links`
      : "Merged and deduplicated candidates"
  });
  const items = compressEnterpriseCandidates(
    preferred,
    options.limit ?? collectors.length * SOURCE_ITEM_LIMIT,
    now
  );
  if (!items.length) throw new Error("No usable enterprise AI candidates were collected");
  options.onProgress?.({
    id: "aggregate",
    label: "Source aggregator",
    status: "success",
    count: items.length,
    detail: "Candidates sent to DeepSeek"
  });

  return {
    sourceWindow: successes.some((result) => result.sourceWindow === "7d") ? "7d" : "24h",
    items,
    failures,
    sourceStats: successes.map(({ collector, items }) => ({
      id: collector.id,
      label: collector.label,
      count: items.length
    })),
    excludedPreviousUrls
  };
}

export function createDefaultCollectors(): ContentSourceCollector[] {
  return [
    {
      id: "aihot",
      label: "AI HOT",
      collect: async (now) => {
        const source = await fetchAihotWithFallback({ now, minItems: 5, take: SOURCE_ITEM_LIMIT });
        return { ...source, items: source.items.slice(0, SOURCE_ITEM_LIMIT) };
      }
    },
    {
      id: "hacker-news",
      label: "Hacker News",
      collect: () => fetchHackerNewsItems({ limit: SOURCE_ITEM_LIMIT })
    },
    {
      id: "hugging-face",
      label: "Hugging Face Daily Papers",
      collect: (now) => fetchHuggingFaceDailyPapers({ now, limit: SOURCE_ITEM_LIMIT })
    },
    {
      id: "arxiv",
      label: "arXiv RSS",
      collect: () => fetchArxivRssItems({ limit: SOURCE_ITEM_LIMIT })
    },
    {
      id: "github-releases",
      label: "GitHub Releases",
      collect: (now) => fetchGithubReleaseItems({ now, limit: 20 })
    }
  ];
}

function selectSourceCandidates(items: NormalizedContentItem[], now: Date): NormalizedContentItem[] {
  const recent = filterItemsWithinHours(items, now, 24).slice(0, SOURCE_ITEM_LIMIT);
  if (recent.length >= Math.min(SOURCE_MIN_CANDIDATES, items.length)) {
    return recent;
  }

  const latest = [...items].sort((left, right) => {
    const leftTime = new Date(left.publishedAt).getTime();
    const rightTime = new Date(right.publishedAt).getTime();
    return safeTime(rightTime) - safeTime(leftTime);
  });
  return dedupeContentItems([...recent, ...latest]).slice(0, SOURCE_ITEM_LIMIT);
}

function safeTime(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
