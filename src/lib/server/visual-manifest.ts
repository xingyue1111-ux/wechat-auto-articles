import type { VisualBriefManifest } from "@/lib/domain/types";
import { getTextBlob, listPublicBlobPathnames } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath } from "@/lib/storage/paths";
import { validateVisualBriefManifest } from "@/lib/visual-brief";

type ManifestRef = {
  date: string;
  revision?: string;
};

export async function readArticleManifest(date: string, revision?: string): Promise<VisualBriefManifest | null> {
  const text = await getTextBlob(articleManifestPath(date, revision));
  if (!text) {
    return null;
  }
  return validateManifestText(text, revision);
}

export async function readLatestManifest(): Promise<VisualBriefManifest | null> {
  const latestText = await getTextBlob(latestManifestPath());
  if (!latestText) {
    return null;
  }
  const latest = JSON.parse(latestText) as { date?: string; manifestUrl?: string };
  if (latest.manifestUrl) {
    const text = await getTextBlob(latest.manifestUrl);
    if (text) {
      return validateManifestText(text);
    }
  }
  return latest.date ? readArticleManifest(latest.date) : null;
}

export async function listArticleManifestSummaries(limit = 12): Promise<VisualBriefManifest[]> {
  const pathnames = await listPublicBlobPathnames("articles/");
  const runRefs = pathnames
    .map(parseRunManifestPath)
    .filter((ref): ref is ManifestRef => ref !== null);
  const datesWithRuns = new Set(runRefs.map((ref) => ref.date));
  const stableRefs = pathnames
    .map(parseStableManifestPath)
    .filter((ref): ref is ManifestRef => ref !== null && !datesWithRuns.has(ref.date));
  const manifests = await Promise.all([...runRefs, ...stableRefs].map((ref) => readArticleManifest(ref.date, ref.revision)));
  return manifests
    .filter((manifest): manifest is VisualBriefManifest => manifest !== null)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit);
}

function validateManifestText(text: string, revision?: string): VisualBriefManifest {
  const manifest = validateVisualBriefManifest(JSON.parse(text));
  return revision && !manifest.revision ? { ...manifest, revision } : manifest;
}

function parseRunManifestPath(pathname: string): ManifestRef | null {
  const match = pathname.match(/^articles\/(\d{4}-\d{2}-\d{2})\/runs\/([^/]+)\/manifest\.json$/);
  return match ? { date: match[1], revision: match[2] } : null;
}

function parseStableManifestPath(pathname: string): ManifestRef | null {
  const match = pathname.match(/^articles\/(\d{4}-\d{2}-\d{2})\/manifest\.json$/);
  return match ? { date: match[1] } : null;
}
