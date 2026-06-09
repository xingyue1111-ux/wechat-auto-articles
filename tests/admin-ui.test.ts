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

  it("provides a source preflight check before generation", async () => {
    const componentSource = await readFile(
      path.join(process.cwd(), "src", "components", "generate-brief-form.tsx"),
      "utf8"
    );
    const routeSource = await readFile(
      path.join(process.cwd(), "src", "app", "api", "admin", "preflight", "route.ts"),
      "utf8"
    );

    expect(componentSource).toContain("/api/admin/preflight");
    expect(componentSource).toContain("生成前预检");
    expect(componentSource).toContain("preflight-card");
    expect(routeSource).toContain("collectEnterpriseAiCandidates");
    expect(routeSource).toContain("candidateCount");
    expect(routeSource).toContain("sourceStats");
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
    expect(source).toContain("articleAdminHref(article)");
    expect(source).toContain("article-history-cover");
    expect(source).toContain("generationModeLabel");
    expect(source).toContain("规则兜底");
  });

  it("links to the history archive from admin", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");

    expect(source).toContain('href="/archive"');
    expect(source).toContain("历史归档");
  });

  it("renders archive copy, illustrations, final sheets and sources", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "components", "archive-page.tsx"), "utf8");

    expect(source).toContain("archive-card-cover");
    expect(source).toContain("公众号完整正文");
    expect(source).toContain("articleAdminHref(article)");
    expect(source).toContain("查看发布稿");
    expect(source).toContain("Seedream 原始配图");
    expect(source).toContain("最终公众号长图");
    expect(source).toContain("原始信号来源");
    expect(source).toContain("该历史版本未保存正文");
    expect(source).toContain("该历史版本未保存原始配图");
  });

  it("provides a protected wechat publishing workbench", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "wechat-publishing-workbench.tsx"),
      "utf8"
    );

    expect(source).toContain("一键复制公众号正文");
    expect(source).toContain("navigator.clipboard.write");
    expect(source).toContain("ClipboardItem");
    expect(source).toContain('document.execCommand("copy")');
    expect(source).toContain("articleLongImageHref(manifest)");
    expect(source).toContain("手动上传 4 张配图");
    expect(source).toContain("避免公众号发布后外链图片消失");
    expect(source).toContain("下载图");
    expect(source).toContain("备用长图");
  });

  it("shows a four-image manual upload checklist in the publishing workbench", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "wechat-publishing-workbench.tsx"),
      "utf8"
    );

    expect(source).toContain("uploadChecklist");
    expect(source).toContain("发布前检查");
    expect(source).toContain("已上传配图");
    expect(source).toContain("全部 4 张配图已确认");
  });

  it("redirects completed generation to the publishing workbench", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "app", "api", "admin", "generate-stream", "route.ts"),
      "utf8"
    );

    expect(source).toContain("articleAdminHref(manifest)");
    expect(source).toContain("redirectUrl:");
  });

  it("loads article pages by revision when a run is provided", async () => {
    const adminSource = await readFile(
      path.join(process.cwd(), "src", "app", "admin", "article", "[date]", "page.tsx"),
      "utf8"
    );
    const articleSource = await readFile(
      path.join(process.cwd(), "src", "app", "article", "[date]", "page.tsx"),
      "utf8"
    );

    expect(adminSource).toContain("searchParams");
    expect(adminSource).toContain("readArticleManifest(date, run)");
    expect(articleSource).toContain("searchParams");
    expect(articleSource).toContain("readArticleManifest(date, run)");
  });
});
