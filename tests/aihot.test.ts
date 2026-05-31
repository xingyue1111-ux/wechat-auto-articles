import { describe, expect, it } from "vitest";
import {
  AIHOT_BROWSER_USER_AGENT,
  dedupeAihotItems,
  fetchAihotWithFallback,
  normalizeAihotItem
} from "@/lib/aihot";

describe("AI HOT ingestion", () => {
  it("normalizes selected API items into stable content records", () => {
    const item = normalizeAihotItem({
      id: "hot-1",
      title: " Agentic workflow ships ",
      url: "https://example.com/story",
      summary: "A practical AI workflow case",
      source: "AI HOT",
      category: "Agent",
      tags: ["workflow", "AI"],
      published_at: "2026-05-26T10:00:00.000Z"
    });

    expect(item).toEqual({
      externalId: "hot-1",
      title: "Agentic workflow ships",
      url: "https://example.com/story",
      summary: "A practical AI workflow case",
      source: "AI HOT",
      category: "Agent",
      tags: ["workflow", "AI"],
      publishedAt: "2026-05-26T10:00:00.000Z",
      contentHash: "aihot:hot-1"
    });
  });

  it("dedupes by external id first and normalized url second", () => {
    const items = [
      normalizeAihotItem({ id: "a", title: "A", url: "https://example.com/a" }),
      normalizeAihotItem({ id: "a", title: "A duplicate", url: "https://example.com/a-copy" }),
      normalizeAihotItem({ id: "b", title: "B", url: "https://example.com/B/" }),
      normalizeAihotItem({ title: "B duplicate", url: "https://example.com/b" })
    ];

    const unique = dedupeAihotItems(items);

    expect(unique.map((item) => item.title)).toEqual(["A", "B"]);
  });

  it("fetches AI HOT with a browser User-Agent header", async () => {
    const urls: string[] = [];
    const agents: string[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(input));
      agents.push(new Headers(init?.headers).get("User-Agent") ?? "");
      return Response.json({ items: [], nextCursor: null });
    };

    await fetchAihotWithFallback({ now: new Date("2026-05-29T12:00:00.000Z"), minItems: 1, fetcher });

    expect(urls[0]).toContain("mode=selected");
    expect(agents[0]).toBe(AIHOT_BROWSER_USER_AGENT);
  });

  it("keeps the strict 24h window even when the result has too few items", async () => {
    const urls: string[] = [];
    const fetcher = async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return Response.json({ items: [], nextCursor: null });
    };

    const result = await fetchAihotWithFallback({
      now: new Date("2026-05-29T12:00:00.000Z"),
      minItems: 1,
      fetcher
    });

    expect(result.sourceWindow).toBe("24h");
    expect(result.items).toHaveLength(0);
    expect(urls[0]).toContain("since=2026-05-28T12%3A00%3A00.000Z");
    expect(urls).toHaveLength(1);
  });
});
