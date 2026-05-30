import { fetchAihotWithFallback } from "@/lib/aihot";
import { fetchArxivRssItems } from "@/lib/content-sources/arxiv";
import { fetchGithubReleaseItems } from "@/lib/content-sources/github-releases";
import { fetchHackerNewsItems } from "@/lib/content-sources/hacker-news";
import { fetchHuggingFaceDailyPapers } from "@/lib/content-sources/hugging-face";
import { compressEnterpriseCandidates, dedupeContentItems } from "@/lib/content-sources/shared";
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

export async function collectEnterpriseAiCandidates(options: {
  now?: Date;
  limit?: number;
  collectors?: ContentSourceCollector[];
  onProgress?: (event: ContentSourceProgressEvent) => void;
} = {}): Promise<{
  sourceWindow: SourceWindow;
  items: NormalizedContentItem[];
  failures: Array<{ id: ContentSourceId; label: string; error: string }>;
}> {
  const now = options.now ?? new Date();
  const collectors = options.collectors ?? createDefaultCollectors();
  const settled = await Promise.allSettled(
    collectors.map(async (collector) => {
      options.onProgress?.({ id: collector.id, label: collector.label, status: "running" });
      try {
        const output = await collector.collect(now);
        const normalized = Array.isArray(output) ? { items: output } : output;
        options.onProgress?.({
          id: collector.id,
          label: collector.label,
          status: "success",
          count: normalized.items.length
        });
        return { collector, ...normalized };
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
  options.onProgress?.({
    id: "aggregate",
    label: "Source aggregator",
    status: "success",
    count: merged.length,
    detail: "Merged and deduplicated candidates"
  });
  const items = compressEnterpriseCandidates(merged, options.limit ?? 30);
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
    failures
  };
}

export function createDefaultCollectors(): ContentSourceCollector[] {
  return [
    {
      id: "aihot",
      label: "AI HOT",
      collect: async (now) => {
        const source = await fetchAihotWithFallback({ now, minItems: 5, take: 30 });
        return { ...source, items: source.items.slice(0, 30) };
      }
    },
    {
      id: "hacker-news",
      label: "Hacker News",
      collect: () => fetchHackerNewsItems({ limit: 15 })
    },
    {
      id: "hugging-face",
      label: "Hugging Face Daily Papers",
      collect: (now) => fetchHuggingFaceDailyPapers({ now, limit: 10 })
    },
    {
      id: "arxiv",
      label: "arXiv RSS",
      collect: () => fetchArxivRssItems({ limit: 12 })
    },
    {
      id: "github-releases",
      label: "GitHub Releases",
      collect: (now) => fetchGithubReleaseItems({ now, limit: 20 })
    }
  ];
}
