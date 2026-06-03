import { notFound } from "next/navigation";
import { VisualBriefPage } from "@/components/visual-brief-page";
import { readArticleManifest } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";

export default async function ArticleDatePage({
  params,
  searchParams
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ run?: string | string[] }>;
}) {
  const { date } = await params;
  const run = runParam(await searchParams);
  const manifest = await readArticleManifest(date, run);
  if (!manifest) {
    notFound();
  }
  return <VisualBriefPage manifest={manifest} />;
}

function runParam(searchParams: { run?: string | string[] }): string | undefined {
  return Array.isArray(searchParams.run) ? searchParams.run[0] : searchParams.run;
}
