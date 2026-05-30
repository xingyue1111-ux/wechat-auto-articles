import type { NormalizedContentItem } from "@/lib/domain/types";
import { daysBefore, dedupeContentItems, stringValue, toDateKey } from "@/lib/content-sources/shared";

type HuggingFaceDailyPaper = {
  paper?: {
    id?: string;
    title?: string;
    summary?: string;
    ai_summary?: string;
    ai_keywords?: unknown[];
    upvotes?: number;
    submittedOnDailyAt?: string;
    publishedAt?: string;
  };
  title?: string;
  summary?: string;
  publishedAt?: string;
};

export function normalizeHuggingFacePaper(raw: HuggingFaceDailyPaper): NormalizedContentItem {
  const paper = raw.paper ?? {};
  const id = stringValue(paper.id);
  const keywords = Array.isArray(paper.ai_keywords)
    ? paper.ai_keywords.map(stringValue).filter(Boolean)
    : [];
  const summary = stringValue(paper.ai_summary) || stringValue(paper.summary) || stringValue(raw.summary);

  return {
    externalId: id,
    title: stringValue(paper.title) || stringValue(raw.title) || "Untitled Hugging Face paper",
    url: `https://huggingface.co/papers/${id}`,
    summary: `${summary}${paper.upvotes ? ` Upvotes: ${paper.upvotes}.` : ""}`.trim(),
    source: "Hugging Face Daily Papers",
    category: "research-signal",
    tags: keywords,
    publishedAt:
      stringValue(paper.submittedOnDailyAt) ||
      stringValue(paper.publishedAt) ||
      stringValue(raw.publishedAt) ||
      new Date(0).toISOString(),
    contentHash: `hugging-face-paper:${id}`
  };
}

export async function fetchHuggingFaceDailyPapers(options: {
  fetcher?: typeof fetch;
  now?: Date;
  limit?: number;
} = {}): Promise<NormalizedContentItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const responses = await Promise.allSettled(
    [0, 1, 2].map(async (offset) => {
      const date = toDateKey(daysBefore(now, offset));
      const response = await fetcher(`https://huggingface.co/api/daily_papers?date=${date}`);
      if (!response.ok) throw new Error(`Hugging Face Daily Papers request failed with ${response.status}`);
      return ((await response.json()) as HuggingFaceDailyPaper[]).map(normalizeHuggingFacePaper);
    })
  );

  const papers = responses.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (!papers.length && responses.every((result) => result.status === "rejected")) {
    throw new Error("Hugging Face Daily Papers requests failed");
  }

  return dedupeContentItems(papers).slice(0, options.limit ?? 10);
}

