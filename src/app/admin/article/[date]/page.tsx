import { notFound } from "next/navigation";
import { WechatPublishingWorkbench } from "@/components/wechat-publishing-workbench";
import { readArticleManifest } from "@/lib/server/visual-manifest";
import { buildWechatArticleHtml } from "@/lib/wechat-article-html";

export const dynamic = "force-dynamic";

export default async function AdminArticlePage({
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
  return <WechatPublishingWorkbench manifest={manifest} html={buildWechatArticleHtml(manifest)} />;
}

function runParam(searchParams: { run?: string | string[] }): string | undefined {
  return Array.isArray(searchParams.run) ? searchParams.run[0] : searchParams.run;
}
