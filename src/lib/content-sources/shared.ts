import type { NormalizedContentItem } from "@/lib/domain/types";

const ENTERPRISE_KEYWORDS: Array<[string, number]> = [
  ["agent", 4],
  ["workflow", 4],
  ["harness", 4],
  ["mcp", 4],
  ["permission", 3],
  ["sandbox", 3],
  ["evaluation", 3],
  ["observability", 3],
  ["governance", 3],
  ["security", 3],
  ["automation", 3],
  ["knowledge", 2],
  ["customer service", 2],
  ["operations", 2],
  ["coding", 2],
  ["enterprise", 2],
  ["cost", 2],
  ["memory", 2],
  ["skill", 2],
  ["hook", 2],
  ["智能体", 4],
  ["工作流", 4],
  ["权限", 3],
  ["沙箱", 3],
  ["评测", 3],
  ["可观测", 3],
  ["治理", 3],
  ["安全", 3],
  ["自动化", 3],
  ["知识库", 2],
  ["客服", 2],
  ["运营", 2],
  ["企业", 2],
  ["成本", 2],
  ["记忆", 2]
];

export function dedupeContentItems(items: NormalizedContentItem[]): NormalizedContentItem[] {
  const seenHashes = new Set<string>();
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: NormalizedContentItem[] = [];

  for (const item of items) {
    const hash = item.contentHash.trim().toLowerCase();
    const url = normalizeUrlKey(item.url);
    const title = normalizeTitleKey(item.title);
    if (
      (hash && seenHashes.has(hash)) ||
      (url && seenUrls.has(url)) ||
      (title && seenTitles.has(title))
    ) {
      continue;
    }

    if (hash) seenHashes.add(hash);
    if (url) seenUrls.add(url);
    if (title) seenTitles.add(title);
    unique.push(item);
  }

  return unique;
}

export function scoreEnterpriseRelevance(item: NormalizedContentItem): number {
  const haystack = [item.title, item.summary, item.category, ...item.tags].join(" ").toLowerCase();
  return ENTERPRISE_KEYWORDS.reduce(
    (score, [keyword, weight]) => score + (haystack.includes(keyword) ? weight : 0),
    0
  );
}

export function compressEnterpriseCandidates(
  items: NormalizedContentItem[],
  limit = 30
): NormalizedContentItem[] {
  const groups = new Map<string, NormalizedContentItem[]>();
  const unique = dedupeContentItems(items);
  const relevant = unique.filter((item) => scoreEnterpriseRelevance(item) > 0);
  const candidates = relevant.length ? relevant : unique;
  for (const item of candidates) {
    const group = groups.get(item.source) ?? [];
    group.push(item);
    groups.set(item.source, group);
  }

  for (const group of groups.values()) {
    group.sort((left, right) => scoreEnterpriseRelevance(right) - scoreEnterpriseRelevance(left));
  }

  const compressed: NormalizedContentItem[] = [];
  while (compressed.length < limit) {
    let added = false;
    for (const group of groups.values()) {
      const candidate = group.shift();
      if (!candidate) continue;
      compressed.push(candidate);
      added = true;
      if (compressed.length === limit) break;
    }
    if (!added) break;
  }

  return compressed;
}

export function filterItemsWithinHours(
  items: NormalizedContentItem[],
  now: Date,
  hours: number
): NormalizedContentItem[] {
  const cutoff = now.getTime() - hours * 60 * 60 * 1000;
  return items
    .filter((item) => {
      const publishedAt = new Date(item.publishedAt).getTime();
      return Number.isFinite(publishedAt) && publishedAt >= cutoff && publishedAt <= now.getTime();
    })
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
}

export function normalizeUrlKey(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().replace(/\/$/, "").toLowerCase();
  }
}

export function normalizeTitleKey(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function stripMarkup(value: unknown): string {
  return stringValue(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}
