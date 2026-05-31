import { ArchivePage } from "@/components/archive-page";
import { listArticleManifestSummaries } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";

export default async function ArchiveRoute() {
  const articles = await listArticleManifestSummaries(60).catch(() => []);
  return <ArchivePage articles={articles} />;
}
