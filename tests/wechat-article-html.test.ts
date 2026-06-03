import { describe, expect, it } from "vitest";
import {
  WECHAT_ARTICLE_LAYOUT_COUNT,
  buildWechatArticleHtml,
  wechatArticleLayoutVariant
} from "@/lib/wechat-article-html";
import type { VisualBriefManifest } from "@/lib/domain/types";

describe("wechat article html", () => {
  it("renders simple inline html with manual image placeholders in reading order", () => {
    const html = buildWechatArticleHtml(manifest());

    expect(html).toContain("<h1");
    expect(html).toContain("企业 AI 正在进入稳定交付阶段");
    expect(html).toContain("<blockquote");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("https://blob.example/1.png");
    expect(html.match(/请在此处手动上传配图/g)).toHaveLength(4);
    expect(html.indexOf("请在此处手动上传配图 1")).toBeLessThan(html.indexOf("请在此处手动上传配图 2"));
    expect(html.indexOf("请在此处手动上传配图 2")).toBeLessThan(html.indexOf("请在此处手动上传配图 3"));
    expect(html.indexOf("请在此处手动上传配图 3")).toBeLessThan(html.indexOf("请在此处手动上传配图 4"));
  });

  it("keeps text readable when illustrations are missing", () => {
    const input = manifest();
    input.illustrations = [];

    const html = buildWechatArticleHtml(input);

    expect(html).toContain("为什么重要");
    expect(html).not.toContain("<img");
  });

  it("escapes reader-facing text", () => {
    const input = manifest();
    input.title = "<script>alert(1)</script>";

    expect(buildWechatArticleHtml(input)).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("provides multiple stable layout variants for different generation runs", () => {
    expect(WECHAT_ARTICLE_LAYOUT_COUNT).toBeGreaterThanOrEqual(4);

    const variants = Array.from({ length: WECHAT_ARTICLE_LAYOUT_COUNT }, (_, index) =>
      wechatArticleLayoutVariant({ ...manifest(), revision: `run-${index}` })
    );

    expect(new Set(variants).size).toBe(WECHAT_ARTICLE_LAYOUT_COUNT);
    expect(wechatArticleLayoutVariant({ ...manifest(), revision: "run-2" })).toBe(
      wechatArticleLayoutVariant({ ...manifest(), revision: "run-2" })
    );
  });

  it("changes the copied article layout across adjacent generation runs", () => {
    const first = buildWechatArticleHtml({ ...manifest(), revision: "run-0" });
    const second = buildWechatArticleHtml({ ...manifest(), revision: "run-1" });

    expect(first).toContain('data-layout="');
    expect(second).toContain('data-layout="');
    expect(first).not.toBe(second);
    expect(first).not.toContain("<style");
    expect(second).not.toContain("<img");
  });
});

function manifest(): VisualBriefManifest {
  const kinds = ["cover", "context", "news", "news", "news", "news", "news", "news", "takeaway", "footer"] as const;
  const titles = [
    "企业 AI 正在进入稳定交付阶段",
    "今天为什么值得关注",
    "发生了什么",
    "关键事实",
    "为什么重要",
    "企业影响",
    "如何判断",
    "行动建议",
    "先做小范围验证",
    "发布提醒"
  ];
  return {
    date: "2026-06-02",
    title: titles[0],
    subtitle: "把公开信号变成可执行判断",
    generatedAt: "2026-06-02T11:00:00.000Z",
    sourceWindow: "24h",
    article: {
      panels: kinds.map((kind, index) => ({
        kind,
        kicker: `SECTION ${index + 1}`,
        title: titles[index],
        body: [`正文段落 ${index + 1}`],
        sourceUrls: ["https://example.com/source"]
      }))
    },
    illustrations: Array.from({ length: 4 }, (_, index) => ({
      index: index + 1,
      imageUrl: `https://blob.example/${index + 1}.png`
    })),
    panels: [
      { index: 1, kind: "cover", title: "封面", imageUrl: "https://blob.example/sheet-1.png", width: 1080, height: 2100, sourceUrls: [] },
      { index: 2, kind: "news", title: "主线", imageUrl: "https://blob.example/sheet-2.png", width: 1080, height: 2200, sourceUrls: [] },
      { index: 3, kind: "news", title: "判断", imageUrl: "https://blob.example/sheet-3.png", width: 1080, height: 2200, sourceUrls: [] },
      { index: 4, kind: "takeaway", title: "结尾", imageUrl: "https://blob.example/sheet-4.png", width: 1080, height: 1800, sourceUrls: [] }
    ]
  };
}
