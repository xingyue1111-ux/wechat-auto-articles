import { describe, expect, it } from "vitest";
import type { NormalizedContentItem } from "@/lib/domain/types";
import {
  compressEnterpriseCandidates,
  dedupeContentItems,
  filterItemsWithinHours,
  scoreEnterpriseRelevance
} from "@/lib/content-sources/shared";
import { normalizeHackerNewsItem } from "@/lib/content-sources/hacker-news";
import { normalizeHuggingFacePaper } from "@/lib/content-sources/hugging-face";
import { parseArxivRss } from "@/lib/content-sources/arxiv";
import {
  GITHUB_RELEASE_RADAR,
  normalizeGithubRelease
} from "@/lib/content-sources/github-releases";
import {
  collectEnterpriseAiCandidates,
  type ContentSourceCollector
} from "@/lib/content-sources/aggregate";

describe("enterprise AI content utilities", () => {
  it("dedupes cross-source items by normalized URL and title", () => {
    const unique = dedupeContentItems([
      item("AI HOT", "a", "Agent workflow launch", "https://example.com/agent/"),
      item("Hacker News", "b", "Different title", "https://example.com/agent#discussion"),
      item("GitHub Releases", "c", " Agent   Workflow Launch ", "https://example.com/release")
    ]);

    expect(unique).toHaveLength(1);
  });

  it("scores enterprise Agent workflow signals above generic AI news", () => {
    const workflow = item(
      "Hacker News",
      "workflow",
      "Agent workflow adds permission controls and evaluation",
      "https://example.com/workflow"
    );
    const generic = item("Hacker News", "generic", "AI image demo", "https://example.com/demo");

    expect(scoreEnterpriseRelevance(workflow)).toBeGreaterThan(scoreEnterpriseRelevance(generic));
  });

  it("compresses candidates while preserving source diversity", () => {
    const candidates = [
      item("AI HOT", "1", "Agent workflow automation", "https://example.com/1"),
      item("AI HOT", "2", "Knowledge base governance", "https://example.com/2"),
      item("Hacker News", "3", "Coding agent sandbox", "https://example.com/3"),
      item("Hugging Face Daily Papers", "4", "Evaluation for GUI agents", "https://example.com/4"),
      item("arXiv", "5", "Enterprise agent security benchmark", "https://example.com/5"),
      item("GitHub Releases", "6", "MCP SDK permissions release", "https://example.com/6")
    ];

    const compressed = compressEnterpriseCandidates(candidates, 5);

    expect(compressed).toHaveLength(5);
    expect(new Set(compressed.map((candidate) => candidate.source)).size).toBe(5);
  });

  it("drops generic news when enterprise implementation signals are available", () => {
    const compressed = compressEnterpriseCandidates([
      item("AI HOT", "1", "Agent workflow permissions", "https://example.com/agent"),
      {
        ...item("AI HOT", "2", "Celebrity uses an image filter", "https://example.com/image-filter"),
        category: "general"
      }
    ]);

    expect(compressed.map((candidate) => candidate.externalId)).toEqual(["1"]);
  });

  it("keeps only the rolling previous 24 hours and sorts newest first", () => {
    const now = new Date("2026-05-31T12:00:00.000Z");
    const recent = { ...item("AI HOT", "recent", "Agent workflow", "https://example.com/recent"), publishedAt: "2026-05-31T11:00:00.000Z" };
    const older = { ...item("AI HOT", "older", "Agent workflow", "https://example.com/older"), publishedAt: "2026-05-30T13:00:00.000Z" };
    const expired = { ...item("AI HOT", "expired", "Agent workflow", "https://example.com/expired"), publishedAt: "2026-05-30T11:59:59.000Z" };

    expect(filterItemsWithinHours([older, expired, recent], now, 24).map((entry) => entry.externalId)).toEqual([
      "recent",
      "older"
    ]);
  });
});

describe("public source normalizers", () => {
  it("normalizes a Hacker News story", () => {
    const normalized = normalizeHackerNewsItem({
      id: 42,
      type: "story",
      title: "Coding agent sandbox for enterprise teams",
      url: "https://example.com/hn-story",
      time: 1780000000,
      score: 120,
      descendants: 36
    });

    expect(normalized?.contentHash).toBe("hacker-news:42");
    expect(normalized?.summary).toContain("120");
  });

  it("normalizes a Hugging Face daily paper", () => {
    const normalized = normalizeHuggingFacePaper({
      paper: {
        id: "2605.14747",
        title: "Video2GUI",
        summary: "A dataset for GUI agents",
        ai_keywords: ["GUI agents", "evaluation"],
        upvotes: 145,
        submittedOnDailyAt: "2026-05-21T00:00:00.000Z"
      }
    });

    expect(normalized.contentHash).toBe("hugging-face-paper:2605.14747");
    expect(normalized.url).toBe("https://huggingface.co/papers/2605.14747");
    expect(normalized.tags).toContain("GUI agents");
  });

  it("parses and dedupes arXiv RSS entries", () => {
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0"><channel>
        <item>
          <title>Reliable Agent Evaluation</title>
          <link>https://arxiv.org/abs/2605.00001</link>
          <description>Evaluation workflows for enterprise agents.</description>
          <guid isPermaLink="false">oai:arXiv.org:2605.00001v1</guid>
          <pubDate>Thu, 21 May 2026 00:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Reliable Agent Evaluation</title>
          <link>https://arxiv.org/abs/2605.00001</link>
          <description>Duplicate item.</description>
          <guid isPermaLink="false">oai:arXiv.org:2605.00001v1</guid>
          <pubDate>Thu, 21 May 2026 00:00:00 GMT</pubDate>
        </item>
      </channel></rss>`;

    const items = parseArxivRss(rss);

    expect(items).toHaveLength(1);
    expect(items[0].contentHash).toBe("arxiv:oai:arXiv.org:2605.00001v1");
  });

  it("tracks modern Coding Agent releases and normalizes GitHub releases", () => {
    const repositories = GITHUB_RELEASE_RADAR.map((entry) => entry.repository);
    const normalized = normalizeGithubRelease(
      { repository: "openai/codex", tier: 1, category: "coding-agent" },
      {
        id: 123,
        tag_name: "v1.2.3",
        name: "Codex CLI v1.2.3",
        html_url: "https://github.com/openai/codex/releases/tag/v1.2.3",
        body: "Adds sandbox controls and workflow improvements.",
        published_at: "2026-05-21T00:00:00.000Z"
      }
    );

    expect(repositories).toContain("openai/codex");
    expect(repositories).toContain("anthropics/claude-code");
    expect(repositories).toContain("google-gemini/gemini-cli");
    expect(normalized.contentHash).toBe("github-release:openai/codex:123");
    expect(normalized.category).toBe("coding-agent");
  });
});

describe("multisource aggregation", () => {
  it("keeps successful sources when one source fails", async () => {
    const events: string[] = [];
    const collectors: ContentSourceCollector[] = [
      collector("aihot", "AI HOT", [item("AI HOT", "1", "Agent workflow automation", "https://example.com/1")]),
      {
        id: "arxiv",
        label: "arXiv",
        collect: async () => {
          throw new Error("RSS unavailable");
        }
      }
    ];

    const result = await collectEnterpriseAiCandidates({
      collectors,
      now: new Date("2026-05-21T12:00:00.000Z"),
      onProgress: (event) => events.push(`${event.status}:${event.id}`)
    });

    expect(result.items).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(events).toContain("error:arxiv");
  });

  it("fails only when every source fails", async () => {
    const collectors: ContentSourceCollector[] = [
      {
        id: "aihot",
        label: "AI HOT",
        collect: async () => {
          throw new Error("down");
        }
      }
    ];

    await expect(collectEnterpriseAiCandidates({ collectors })).rejects.toThrow("No content sources");
  });
});

function collector(id: ContentSourceCollector["id"], label: string, items: NormalizedContentItem[]): ContentSourceCollector {
  return { id, label, collect: async () => items };
}

function item(source: string, id: string, title: string, url: string): NormalizedContentItem {
  return {
    externalId: id,
    title,
    url,
    summary: title,
    source,
    category: "enterprise-ai",
    tags: [],
    publishedAt: "2026-05-21T00:00:00.000Z",
    contentHash: `${source}:${id}`
  };
}
