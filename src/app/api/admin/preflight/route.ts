import { hasValidAdminSession } from "@/lib/admin/auth";
import { collectEnterpriseAiCandidates } from "@/lib/content-sources/aggregate";
import type { VisualBriefManifest } from "@/lib/domain/types";
import { readLatestManifest } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

export async function GET() {
  if (!(await hasValidAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const previousManifest = await readLatestManifest().catch(() => null);
    const previousSourceUrls = previousManifest
      ? manifestSourceUrls(previousManifest)
      : [];
    const source = await collectEnterpriseAiCandidates({ excludedUrls: previousSourceUrls });

    return Response.json({
      ok: true,
      sourceWindow: source.sourceWindow,
      candidateCount: source.items.length,
      sourceStats: source.sourceStats,
      failures: source.failures,
      excludedPreviousUrls: source.excludedPreviousUrls,
      sampleItems: source.items.slice(0, 6).map((item) => ({
        title: item.title,
        source: item.source,
        category: item.category,
        publishedAt: item.publishedAt
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

function manifestSourceUrls(manifest: VisualBriefManifest): string[] {
  const panels = manifest.article?.panels.length ? manifest.article.panels : manifest.panels;
  return Array.from(new Set(panels.flatMap((panel) => panel.sourceUrls)));
}
