import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin generation form", () => {
  it("streams generation progress into a VSCode-style output panel", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "generate-brief-form.tsx"),
      "utf8"
    );

    expect(source).toContain('/api/admin/generate-stream');
    expect(source).toContain("response.body.getReader()");
    expect(source).toContain('className="output-console"');
    expect(source).toContain("clearLogs");
    expect(source).toContain("window.location.assign(event.redirectUrl)");
    expect(source).toContain("任务没有返回完成状态");
    expect(source).toContain('timestamp: ""');
    expect(source).toContain('if (!timestamp) return "--:--:--"');
  });

  it("lists all five public signal sources", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");

    expect(source).toContain("AI HOT");
    expect(source).toContain("Hacker News");
    expect(source).toContain("Hugging Face Daily Papers");
    expect(source).toContain("arXiv RSS");
    expect(source).toContain("GitHub Releases");
    expect(source).toContain('value="4 张"');
  });

  it("shows saved visual briefs as a clickable history list", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");

    expect(source).toContain("listArticleManifestSummaries");
    expect(source).toContain("已保存简报");
    expect(source).toContain('href={`/article/${article.date}`}');
    expect(source).toContain("article-history-cover");
  });

  it("links to the history archive from admin", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");

    expect(source).toContain('href="/archive"');
    expect(source).toContain("历史归档");
  });

  it("renders archive copy, illustrations, final sheets and sources", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "components", "archive-page.tsx"), "utf8");

    expect(source).toContain("archive-card-cover");
    expect(source).toContain("推文内容");
    expect(source).toContain("Seedream 原始配图");
    expect(source).toContain("最终公众号长图");
    expect(source).toContain("原始信号来源");
    expect(source).toContain("该历史版本未保存正文");
    expect(source).toContain("该历史版本未保存原始配图");
  });
});
