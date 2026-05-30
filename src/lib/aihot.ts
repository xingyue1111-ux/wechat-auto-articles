import type { NormalizedContentItem } from "@/lib/domain/types";
import type { SourceWindow } from "@/lib/domain/types";
import { upstreamError } from "@/lib/server/generation-progress";

type AihotRawItem = Record<string, unknown>;

type AihotPage = {
  items?: AihotRawItem[];
  data?: AihotRawItem[] | { items?: AihotRawItem[]; nextCursor?: string | null };
  nextCursor?: string | null;
  next_cursor?: string | null;
};

export type FetchAihotOptions = {
  baseUrl?: string;
  mode?: "selected" | "all";
  take?: number;
  since?: string;
  fetcher?: typeof fetch;
};

export type FetchAihotFallbackOptions = FetchAihotOptions & {
  now?: Date;
  minItems?: number;
};

export const AIHOT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function normalizeAihotItem(raw: AihotRawItem): NormalizedContentItem {
  const externalId = stringValue(raw.id) || stringValue(raw.external_id);
  const title = requiredTrimmed(raw.title, "Untitled AI HOT item");
  const url = requiredTrimmed(raw.url ?? raw.link ?? raw.source_url, "");
  const source = requiredTrimmed(raw.source ?? raw.source_name, "AI HOT");
  const category = requiredTrimmed(raw.category ?? raw.category_label, "Uncategorized");
  const tags = normalizeTags(raw.tags);
  const publishedAt =
    stringValue(raw.published_at) ||
    stringValue(raw.publishedAt) ||
    stringValue(raw.created_at) ||
    new Date(0).toISOString();
  const summary = requiredTrimmed(raw.summary ?? raw.description ?? raw.content, "");
  const contentHash = externalId ? `aihot:${externalId}` : `url:${normalizeUrlKey(url)}`;

  return {
    externalId: externalId || undefined,
    title,
    url,
    summary,
    source,
    category,
    tags,
    publishedAt,
    contentHash
  };
}

export function dedupeAihotItems(items: NormalizedContentItem[]): NormalizedContentItem[] {
  const seenExternalIds = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: NormalizedContentItem[] = [];

  for (const item of items) {
    const externalIdKey = item.externalId?.trim().toLowerCase();
    const urlKey = normalizeUrlKey(item.url);

    if ((externalIdKey && seenExternalIds.has(externalIdKey)) || (urlKey && seenUrls.has(urlKey))) {
      continue;
    }

    if (externalIdKey) {
      seenExternalIds.add(externalIdKey);
    }
    if (urlKey) {
      seenUrls.add(urlKey);
    }
    unique.push(item);
  }

  return unique;
}

export async function fetchSelectedAihotItems(
  options: FetchAihotOptions = {}
): Promise<NormalizedContentItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = options.baseUrl ?? "https://aihot.virxact.com";
  const take = String(Math.min(Math.max(options.take ?? 100, 1), 100));
  let cursor: string | null = null;
  const collected: NormalizedContentItem[] = [];

  do {
    const url = new URL("/api/public/items", baseUrl);
    url.searchParams.set("mode", options.mode ?? "selected");
    url.searchParams.set("take", take);
    if (options.since) {
      url.searchParams.set("since", options.since);
    }
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetcher(url, {
      headers: {
        "User-Agent": AIHOT_BROWSER_USER_AGENT
      }
    });
    if (!response.ok) {
      throw await upstreamError("AI HOT", response);
    }

    const page = (await response.json()) as AihotPage;
    collected.push(...extractItems(page).map(normalizeAihotItem));
    cursor = extractNextCursor(page);
  } while (cursor);

  return dedupeAihotItems(collected);
}

export async function fetchAihotWithFallback(
  options: FetchAihotFallbackOptions = {}
): Promise<{ sourceWindow: SourceWindow; items: NormalizedContentItem[] }> {
  const now = options.now ?? new Date();
  const minItems = options.minItems ?? 5;
  const recentItems = await fetchSelectedAihotItems({
    ...options,
    mode: "selected",
    take: options.take ?? 50,
    since: hoursAgo(now, 24)
  });

  if (recentItems.length >= minItems) {
    return { sourceWindow: "24h", items: recentItems };
  }

  const weeklyItems = await fetchSelectedAihotItems({
    ...options,
    mode: "selected",
    take: options.take ?? 50,
    since: daysAgo(now, 7)
  });

  return { sourceWindow: "7d", items: weeklyItems };
}

function extractItems(page: AihotPage): AihotRawItem[] {
  if (Array.isArray(page.items)) {
    return page.items;
  }
  if (Array.isArray(page.data)) {
    return page.data;
  }
  if (page.data && typeof page.data === "object" && Array.isArray(page.data.items)) {
    return page.data.items;
  }
  return [];
}

function extractNextCursor(page: AihotPage): string | null {
  if (typeof page.nextCursor === "string") {
    return page.nextCursor;
  }
  if (typeof page.next_cursor === "string") {
    return page.next_cursor;
  }
  if (
    page.data &&
    !Array.isArray(page.data) &&
    typeof page.data === "object" &&
    typeof page.data.nextCursor === "string"
  ) {
    return page.data.nextCursor;
  }
  return null;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s#]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function requiredTrimmed(value: unknown, fallback: string): string {
  const result = stringValue(value);
  return result || fallback;
}

function normalizeUrlKey(url: string): string {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const normalized = parsed.toString().replace(/\/$/, "");
    return normalized.toLowerCase();
  } catch {
    return url.trim().replace(/\/$/, "").toLowerCase();
  }
}

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
