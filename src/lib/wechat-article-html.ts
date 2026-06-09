import type { ArchivedVisualBriefPanel, VisualBriefManifest } from "@/lib/domain/types";

type WechatArticleLayout = {
  id: string;
  shell: string;
  title: string;
  subtitle: string;
  paragraph: string;
  heading: string;
  imageBox: string;
  imageStrong: string;
  imageHint: string;
  takeaway: string;
  footer: string;
};

const WECHAT_ARTICLE_LAYOUTS: WechatArticleLayout[] = [
  {
    id: "editorial-line",
    shell: "margin:0 auto;max-width:677px;color:#17211f;font-size:16px;line-height:1.85;",
    title: "margin:0 0 14px;font-size:28px;line-height:1.35;",
    subtitle: "margin:0 0 18px;color:#5f6b67;",
    paragraph: "margin:0 0 16px;",
    heading: "margin:28px 0 14px;border-left:4px solid #0f766e;padding-left:10px;font-size:21px;line-height:1.45;",
    imageBox: "margin:22px 0;",
    imageStrong: "",
    imageHint: "font-size:13px;",
    takeaway: "margin:26px 0;border-left:4px solid #d89a2b;background:#f8f2e6;padding:16px 18px;",
    footer: "color:#706d66;font-size:13px;"
  },
  {
    id: "warm-card",
    shell: "margin:0 auto;max-width:677px;color:#1f2320;font-size:16px;line-height:1.9;background:#fffdf8;",
    title: "margin:0 0 12px;padding:18px 18px 12px;border-top:5px solid #0f766e;background:#f8f2e6;font-size:27px;line-height:1.35;",
    subtitle: "margin:0 0 22px;padding:0 18px 16px;background:#f8f2e6;color:#6b5f4a;",
    paragraph: "margin:0 0 17px;padding:0 4px;",
    heading: "margin:30px 0 15px;padding:10px 14px;background:#17211f;color:#fffdf8;border-radius:2px;font-size:20px;line-height:1.45;",
    imageBox: "margin:24px 0;",
    imageStrong: "color:#17211f;",
    imageHint: "font-size:13px;color:#706650;",
    takeaway: "margin:28px 0;padding:18px 18px;background:#f4ead6;border:1px solid #d8c7a5;",
    footer: "color:#766f60;font-size:13px;background:#faf4e8;padding:12px 14px;"
  },
  {
    id: "teal-digest",
    shell: "margin:0 auto;max-width:677px;color:#17211f;font-size:16px;line-height:1.88;",
    title: "margin:0 0 10px;padding-bottom:14px;border-bottom:2px solid #0f766e;font-size:29px;line-height:1.32;",
    subtitle: "margin:0 0 22px;color:#0f766e;font-weight:600;",
    paragraph: "margin:0 0 16px;",
    heading: "margin:30px 0 14px;padding:0 0 8px;border-bottom:1px solid #b7d6d0;color:#0f766e;font-size:22px;line-height:1.45;",
    imageBox: "margin:22px 0;",
    imageStrong: "color:#0f514b;",
    imageHint: "font-size:13px;color:#58736f;",
    takeaway: "margin:28px 0;padding:16px 18px;border-left:5px solid #0f766e;background:#eef8f6;",
    footer: "color:#60706d;font-size:13px;border-top:1px solid #d8e7e4;padding-top:12px;"
  },
  {
    id: "amber-memo",
    shell: "margin:0 auto;max-width:677px;color:#1c2522;font-size:16px;line-height:1.86;",
    title: "margin:0 0 12px;font-size:26px;line-height:1.38;letter-spacing:.2px;",
    subtitle: "margin:0 0 22px;padding:10px 12px;background:#fff5dd;color:#7a5820;border-left:4px solid #d89a2b;",
    paragraph: "margin:0 0 16px;",
    heading: "margin:30px 0 14px;padding-left:12px;border-left:4px solid #d89a2b;color:#17211f;font-size:21px;line-height:1.45;",
    imageBox: "margin:23px 0;",
    imageStrong: "color:#7a4f00;",
    imageHint: "font-size:13px;color:#7a6a4d;",
    takeaway: "margin:27px 0;padding:17px 18px;background:#fff5dd;border-left:5px solid #d89a2b;",
    footer: "color:#766c5b;font-size:13px;border-top:1px dashed #d8c7a5;padding-top:12px;"
  }
];

export const WECHAT_ARTICLE_LAYOUT_COUNT = WECHAT_ARTICLE_LAYOUTS.length;

export function buildWechatArticleHtml(manifest: VisualBriefManifest): string {
  const panels = manifest.article?.panels ?? [];
  const images = manifest.illustrations?.map((item) => item.imageUrl) ?? [];
  const layout = layoutForManifest(manifest);
  const sectionGroups = [
    [panels[2], panels[3]],
    [panels[4], panels[5]],
    [panels[6], panels[7]]
  ];

  return [
    `<section data-layout="${layout.id}" style="${layout.shell}">`,
    `<h1 style="${layout.title}">${escapeHtml(manifest.title)}</h1>`,
    `<p style="${layout.subtitle}">${escapeHtml(manifest.subtitle)}</p>`,
    paragraphHtml(panels[0]?.body ?? [], layout),
    paragraphHtml(panels[1]?.body ?? [], layout),
    imageHtml(images[0], "头图", layout),
    ...sectionGroups.flatMap((group, index) => [
      headingHtml(group[0]?.title ?? `第 ${index + 1} 部分`, layout),
      paragraphHtml(group.flatMap((panel) => panel?.body ?? []), layout),
      imageHtml(images[index + 1], `配图 ${index + 2}`, layout)
    ]),
    takeawayHtml(panels[8], layout),
    footerHtml(panels[9], layout),
    "</section>"
  ].join("");
}

export function wechatArticleLayoutVariant(manifest: Pick<VisualBriefManifest, "date" | "generatedAt" | "revision" | "title">): string {
  return layoutForManifest(manifest).id;
}

function layoutForManifest(manifest: Pick<VisualBriefManifest, "date" | "generatedAt" | "revision" | "title">): WechatArticleLayout {
  const index = layoutIndex(manifest);
  return WECHAT_ARTICLE_LAYOUTS[index] ?? WECHAT_ARTICLE_LAYOUTS[0];
}

function layoutIndex(manifest: Pick<VisualBriefManifest, "date" | "generatedAt" | "revision" | "title">): number {
  const key = manifest.revision ?? `${manifest.generatedAt}:${manifest.date}:${manifest.title}`;
  const numericSuffix = key.match(/(\d+)$/u)?.[1];
  if (numericSuffix) {
    return Number(numericSuffix) % WECHAT_ARTICLE_LAYOUT_COUNT;
  }
  return hashText(key) % WECHAT_ARTICLE_LAYOUT_COUNT;
}

function hashText(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function paragraphHtml(lines: string[], layout: WechatArticleLayout): string {
  return lines.map((line) => `<p style="${layout.paragraph}">${escapeHtml(line)}</p>`).join("");
}

function headingHtml(text: string, layout: WechatArticleLayout): string {
  return `<h2 style="${layout.heading}">${escapeHtml(text)}</h2>`;
}

function imageHtml(url: string | undefined, alt: string, layout: WechatArticleLayout): string {
  return url
    ? `<p style="${layout.imageBox}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:block;width:100%;height:auto;border:0;border-radius:8px;" /></p>`
    : "";
}

function takeawayHtml(panel: ArchivedVisualBriefPanel | undefined, layout: WechatArticleLayout): string {
  if (!panel) return "";
  return `<blockquote style="${layout.takeaway}"><strong>${escapeHtml(panel.title)}</strong>${paragraphHtml(panel.body, layout)}</blockquote>`;
}

function footerHtml(panel: ArchivedVisualBriefPanel | undefined, layout: WechatArticleLayout): string {
  if (!panel) return "";
  return `<hr style="margin:30px 0 16px;border:0;border-top:1px solid #ded8cc;" /><section style="${layout.footer}">${paragraphHtml(panel.body, layout)}</section>`;
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
