import type { ArchivedVisualBriefPanel, VisualBriefManifest } from "@/lib/domain/types";

export function buildWechatArticleHtml(manifest: VisualBriefManifest): string {
  const panels = manifest.article?.panels ?? [];
  const images = manifest.illustrations?.map((item) => item.imageUrl) ?? [];
  const sectionGroups = [
    [panels[2], panels[3]],
    [panels[4], panels[5]],
    [panels[6], panels[7]]
  ];

  return [
    '<section style="margin:0 auto;max-width:677px;color:#17211f;font-size:16px;line-height:1.85;">',
    `<h1 style="margin:0 0 14px;font-size:28px;line-height:1.35;">${escapeHtml(manifest.title)}</h1>`,
    `<p style="margin:0 0 18px;color:#5f6b67;">${escapeHtml(manifest.subtitle)}</p>`,
    paragraphHtml(panels[0]?.body ?? []),
    paragraphHtml(panels[1]?.body ?? []),
    imageHtml(images[0], "头图"),
    ...sectionGroups.flatMap((group, index) => [
      headingHtml(group[0]?.title ?? `第 ${index + 1} 部分`),
      paragraphHtml(group.flatMap((panel) => panel?.body ?? [])),
      imageHtml(images[index + 1], `配图 ${index + 2}`)
    ]),
    takeawayHtml(panels[8]),
    footerHtml(panels[9]),
    "</section>"
  ].join("");
}

function paragraphHtml(lines: string[]): string {
  return lines.map((line) => `<p style="margin:0 0 16px;">${escapeHtml(line)}</p>`).join("");
}

function headingHtml(text: string): string {
  return `<h2 style="margin:28px 0 14px;border-left:4px solid #0f766e;padding-left:10px;font-size:21px;line-height:1.45;">${escapeHtml(text)}</h2>`;
}

function imageHtml(url: string | undefined, alt: string): string {
  const index = alt.match(/\d+/u)?.[0] ?? "1";
  return url
    ? `<p style="margin:22px 0;padding:14px 16px;border:1px dashed #9ca3af;border-radius:8px;background:#f8fafc;color:#475569;text-align:center;"><strong>请在此处手动上传配图 ${index}</strong><br /><span style="font-size:13px;">使用右侧“下载图 ${index}”保存图片，再在公众号编辑器中上传插入。不要直接使用外链图片。</span></p>`
    : "";
}

function takeawayHtml(panel: ArchivedVisualBriefPanel | undefined): string {
  if (!panel) return "";
  return `<blockquote style="margin:26px 0;border-left:4px solid #d89a2b;background:#f8f2e6;padding:16px 18px;"><strong>${escapeHtml(panel.title)}</strong>${paragraphHtml(panel.body)}</blockquote>`;
}

function footerHtml(panel: ArchivedVisualBriefPanel | undefined): string {
  if (!panel) return "";
  return `<hr style="margin:30px 0 16px;border:0;border-top:1px solid #ded8cc;" /><section style="color:#706d66;font-size:13px;">${paragraphHtml(panel.body)}</section>`;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  };
  return value.replace(/[&<>"]/g, (character) => entities[character] ?? character);
}
