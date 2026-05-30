import type { NormalizedContentItem } from "@/lib/domain/types";
import { dedupeContentItems, stripMarkup, stringValue } from "@/lib/content-sources/shared";

export type GithubRadarEntry = {
  repository: string;
  tier: 1 | 2 | 3;
  category: "coding-agent" | "harness-infrastructure" | "enterprise-tool";
};

type GithubRelease = {
  id?: number;
  tag_name?: string;
  name?: string;
  html_url?: string;
  body?: string;
  published_at?: string;
};

export const GITHUB_RELEASE_RADAR: GithubRadarEntry[] = [
  { repository: "openai/codex", tier: 1, category: "coding-agent" },
  { repository: "anthropics/claude-code", tier: 1, category: "coding-agent" },
  { repository: "google-gemini/gemini-cli", tier: 1, category: "coding-agent" },
  { repository: "sst/opencode", tier: 1, category: "coding-agent" },
  { repository: "cline/cline", tier: 1, category: "coding-agent" },
  { repository: "modelcontextprotocol/specification", tier: 2, category: "harness-infrastructure" },
  { repository: "modelcontextprotocol/typescript-sdk", tier: 2, category: "harness-infrastructure" },
  { repository: "modelcontextprotocol/python-sdk", tier: 2, category: "harness-infrastructure" },
  { repository: "openai/openai-agents-python", tier: 2, category: "harness-infrastructure" },
  { repository: "microsoft/agent-framework", tier: 2, category: "harness-infrastructure" },
  { repository: "langgenius/dify", tier: 3, category: "enterprise-tool" },
  { repository: "n8n-io/n8n", tier: 3, category: "enterprise-tool" },
  { repository: "langchain-ai/langchain", tier: 3, category: "enterprise-tool" },
  { repository: "run-llama/llama_index", tier: 3, category: "enterprise-tool" },
  { repository: "vercel/ai", tier: 3, category: "enterprise-tool" }
];

export function normalizeGithubRelease(
  radar: GithubRadarEntry,
  release: GithubRelease
): NormalizedContentItem {
  const id = String(release.id ?? `${radar.repository}:${release.tag_name ?? "latest"}`);
  const notes = stripMarkup(release.body).slice(0, 900);
  return {
    externalId: id,
    title: `${radar.repository}: ${stringValue(release.name) || stringValue(release.tag_name) || "New release"}`,
    url:
      stringValue(release.html_url) ||
      `https://github.com/${radar.repository}/releases/tag/${encodeURIComponent(stringValue(release.tag_name))}`,
    summary: notes || `New ${radar.category} release: ${stringValue(release.tag_name)}.`,
    source: "GitHub Releases",
    category: radar.category,
    tags: [`tier-${radar.tier}`, radar.repository],
    publishedAt: stringValue(release.published_at) || new Date(0).toISOString(),
    contentHash: `github-release:${radar.repository}:${id}`
  };
}

export async function fetchGithubReleaseItems(options: {
  fetcher?: typeof fetch;
  now?: Date;
  limit?: number;
  radar?: GithubRadarEntry[];
} = {}): Promise<NormalizedContentItem[]> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const cutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  const radar = options.radar ?? GITHUB_RELEASE_RADAR;
  const responses = await Promise.allSettled(
    radar.map(async (entry) => {
      const response = await fetcher(`https://api.github.com/repos/${entry.repository}/releases?per_page=2`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "wechat-auto-articles"
        }
      });
      if (!response.ok) throw new Error(`GitHub ${entry.repository} releases request failed with ${response.status}`);
      return ((await response.json()) as GithubRelease[]).map((release) => normalizeGithubRelease(entry, release));
    })
  );
  const releases = responses
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((release) => new Date(release.publishedAt).getTime() >= cutoff);
  if (!releases.length && responses.every((result) => result.status === "rejected")) {
    throw new Error("GitHub Releases requests failed");
  }

  return dedupeContentItems(releases).slice(0, options.limit ?? 20);
}

