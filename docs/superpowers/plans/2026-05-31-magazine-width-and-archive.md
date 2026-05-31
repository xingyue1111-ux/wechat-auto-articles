# Magazine Width And Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 放宽公众号长图标题与正文宽度，并增加每天只展示最后一次生成结果的历史归档页。

**Architecture:** 长图渲染继续使用现有 Satori 模板，只调整封面和正文的视觉宽度。生成流水线扩展 Manifest，保存读者正文与 5 张 Seedream 原图；稳定日期 Manifest 继续覆盖当天最后一次结果。新增 `/archive` 服务端页面读取稳定 Manifest 列表，兼容旧版 Manifest。

**Tech Stack:** Next.js App Router、TypeScript、Satori、Resvg、Vercel Blob、Vitest、ESLint

---

## File Structure

- Modify: `src/lib/visual-render/render-sheet.tsx`
  - 放宽封面标题与正文列宽，保留右侧安全边距。
- Modify: `src/lib/domain/types.ts`
  - 为 Manifest 增加正文与 Seedream 原图字段，字段可选以兼容旧数据。
- Modify: `src/lib/server/visual-pipeline.ts`
  - 生成 Manifest 时写入正文与 5 张已持久化原图。
- Modify: `src/lib/visual-brief.ts`
  - 校验和规范化新增 Manifest 字段。
- Create: `src/components/archive-page.tsx`
  - 展示历史日期、推文内容、原图、最终长图与来源链接。
- Create: `src/app/archive/page.tsx`
  - 读取稳定 Manifest 列表并渲染归档页。
- Modify: `src/app/admin/page.tsx`
  - 增加历史归档入口。
- Modify: `src/app/globals.css`
  - 增加归档页样式。
- Modify: `tests/render-layout.test.ts`
  - 锁定放宽后的视觉宽度。
- Modify: `tests/visual-brief.test.ts`
  - 锁定 Manifest 新字段与旧数据兼容。
- Modify: `tests/admin-ui.test.ts`
  - 锁定归档入口与页面展示结构。
- Create: `tests/visual-manifest.test.ts`
  - 锁定归档列表只读取每天的稳定 Manifest。

### Task 1: 放宽长图标题与正文

**Files:**
- Modify: `src/lib/visual-render/render-sheet.tsx`
- Modify: `tests/render-layout.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/render-layout.test.ts` 增加：

```ts
it("lets cover headlines use the available width before wrapping", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
    "utf8"
  );

  expect(source).toContain("<WrappedLines text={cover.title} maxUnits={20} />");
});

it("aligns editorial copy close to the image right edge", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
    "utf8"
  );

  expect(source).toContain("const contentWidth = radar ? 848 : compact ? 872 : 864");
  expect(source).toContain("paddingRight: 12");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/render-layout.test.ts
```

Expected: FAIL，因为模板仍然使用 `maxUnits={15}`、旧列宽和 `paddingRight: 24`。

- [ ] **Step 3: 最小实现**

在 `src/lib/visual-render/render-sheet.tsx` 中：

```tsx
<WrappedLines text={cover.title} maxUnits={20} />
```

并调整正文：

```ts
const contentWidth = radar ? 848 : compact ? 872 : 864;
```

```tsx
<div style={{ display: "flex", width: contentWidth, flexShrink: 0, flexDirection: "column", paddingRight: 12 }}>
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```powershell
npm.cmd run test:run -- tests/render-layout.test.ts tests/render-sheet.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/lib/visual-render/render-sheet.tsx tests/render-layout.test.ts
git commit -m "fix: widen visual brief magazine copy"
```

### Task 2: 保存正文与 Seedream 原图

**Files:**
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/server/visual-pipeline.ts`
- Modify: `src/lib/visual-brief.ts`
- Modify: `tests/visual-brief.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/visual-brief.test.ts` 增加：

```ts
it("keeps archived article copy and Seedream illustrations", () => {
  const manifest = validateVisualBriefManifest({
    date: "2026-05-31",
    title: "企业 AI 日报",
    subtitle: "过去 24 小时",
    generatedAt: "2026-05-31T11:00:00.000Z",
    sourceWindow: "24h",
    article: {
      panels: [{
        kind: "cover",
        kicker: "本日主线",
        title: "企业 AI 日报",
        body: ["正文"],
        sourceUrls: ["https://example.com/source"]
      }]
    },
    illustrations: [{ index: 1, imageUrl: "https://blob.example/seedream-01.png" }],
    panels: [{
      index: 1,
      kind: "cover",
      title: "封面",
      imageUrl: "https://blob.example/cover.png",
      width: 1080,
      height: 2000,
      sourceUrls: []
    }]
  });

  expect(manifest.article?.panels[0].body).toEqual(["正文"]);
  expect(manifest.illustrations?.[0].imageUrl).toContain("seedream-01.png");
});
```

增加旧数据兼容测试：

```ts
it("keeps older manifests readable without archive extras", () => {
  const manifest = validateVisualBriefManifest({
    date: "2026-05-30",
    title: "旧简报",
    subtitle: "兼容旧数据",
    generatedAt: "2026-05-30T11:00:00.000Z",
    sourceWindow: "24h",
    panels: [{
      index: 1,
      kind: "cover",
      title: "封面",
      imageUrl: "https://blob.example/cover.png",
      width: 1080,
      height: 2000,
      sourceUrls: []
    }]
  });

  expect(manifest.article).toBeUndefined();
  expect(manifest.illustrations).toBeUndefined();
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/visual-brief.test.ts
```

Expected: FAIL，因为 `VisualBriefManifest` 尚未声明归档字段。

- [ ] **Step 3: 扩展 Manifest 类型**

在 `src/lib/domain/types.ts` 增加：

```ts
export type ArchivedVisualBriefPanel = Pick<
  VisualBriefPanelDraft,
  "kind" | "kicker" | "title" | "body" | "sourceUrls"
>;
```

并扩展：

```ts
article?: {
  panels: ArchivedVisualBriefPanel[];
};
illustrations?: Array<{
  index: number;
  imageUrl: string;
}>;
```

- [ ] **Step 4: 在流水线中写入归档字段**

在 `src/lib/server/visual-pipeline.ts` 的 Manifest 构造中增加：

```ts
article: {
  panels: brief.panels.map(({ kind, kicker, title, body, sourceUrls }) => ({
    kind,
    kicker,
    title,
    body,
    sourceUrls
  }))
},
illustrations: persistedSeedreamUrls.map((imageUrl, index) => ({
  index: index + 1,
  imageUrl
})),
```

- [ ] **Step 5: 规范化可选字段**

在 `src/lib/visual-brief.ts` 的 `validateVisualBriefManifest` 中保留并校验可选字段：

```ts
article: input.article && typeof input.article === "object"
  ? {
      panels: Array.isArray(input.article.panels)
        ? input.article.panels.map(normalizeArchivedPanel)
        : []
    }
  : undefined,
illustrations: Array.isArray(input.illustrations)
  ? input.illustrations.map((illustration, index) => ({
      index: Number(illustration.index ?? index + 1),
      imageUrl: String(illustration.imageUrl)
    }))
  : undefined,
```

增加：

```ts
function normalizeArchivedPanel(panel: Record<string, unknown>): ArchivedVisualBriefPanel {
  return {
    kind: String(panel.kind) as VisualPanelKind,
    kicker: String(panel.kicker ?? ""),
    title: String(panel.title ?? ""),
    body: Array.isArray(panel.body) ? panel.body.map(String) : [],
    sourceUrls: Array.isArray(panel.sourceUrls) ? panel.sourceUrls.map(String) : []
  };
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run:

```powershell
npm.cmd run test:run -- tests/visual-brief.test.ts tests/storage.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```powershell
git add src/lib/domain/types.ts src/lib/server/visual-pipeline.ts src/lib/visual-brief.ts tests/visual-brief.test.ts
git commit -m "feat: archive visual brief copy and illustrations"
```

### Task 3: 增加历史归档页

**Files:**
- Create: `src/components/archive-page.tsx`
- Create: `src/app/archive/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/admin-ui.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/admin-ui.test.ts` 增加：

```ts
it("links to the history archive from admin", async () => {
  const source = await readFile(path.join(process.cwd(), "src", "app", "admin", "page.tsx"), "utf8");
  expect(source).toContain('href="/archive"');
  expect(source).toContain("历史归档");
});

it("renders archive copy, illustrations and final sheets", async () => {
  const source = await readFile(path.join(process.cwd(), "src", "components", "archive-page.tsx"), "utf8");
  expect(source).toContain("推文内容");
  expect(source).toContain("Seedream 原始配图");
  expect(source).toContain("最终公众号长图");
  expect(source).toContain("原始信号来源");
  expect(source).toContain("该历史版本未保存正文");
  expect(source).toContain("该历史版本未保存原始配图");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts
```

Expected: FAIL，因为 `/archive` 页面和后台入口尚不存在。

- [ ] **Step 3: 新增归档组件**

创建 `src/components/archive-page.tsx`：

```tsx
import type { VisualBriefManifest } from "@/lib/domain/types";

export function ArchivePage({ articles }: { articles: VisualBriefManifest[] }) {
  return (
    <main className="archive-page">
      <header className="archive-header">
        <p className="eyebrow">Enterprise AI Visual Brief</p>
        <h1>历史归档</h1>
        <p className="muted">同一天只展示最后一次生成结果。</p>
        <a className="button secondary compact" href="/admin">返回生成台</a>
      </header>
      <section className="archive-list">
        {articles.map((article) => (
          <article className="archive-card" key={article.date}>
            <div className="archive-card-heading">
              <div>
                <time>{article.date}</time>
                <h2>{article.title}</h2>
                <p>{article.subtitle}</p>
              </div>
              <a className="button secondary compact" href={`/article/${article.date}`}>查看长图</a>
            </div>
            <details className="archive-copy">
              <summary>查看推文内容</summary>
              {article.article?.panels.length ? (
                article.article.panels.map((panel, index) => (
                  <section key={`${panel.kind}-${index}`}>
                    <small>{panel.kicker}</small>
                    <h3>{panel.title}</h3>
                    {panel.body.map((line, bodyIndex) => <p key={bodyIndex}>{line}</p>)}
                  </section>
                ))
              ) : <p className="muted">该历史版本未保存正文。</p>}
            </details>
            <Gallery title="Seedream 原始配图" images={article.illustrations?.map((item) => item.imageUrl) ?? []} empty="该历史版本未保存原始配图。" />
            <Gallery title="最终公众号长图" images={article.panels.map((panel) => panel.imageUrl)} />
            <SourceLinks panels={article.article?.panels ?? []} />
          </article>
        ))}
      </section>
    </main>
  );
}

function SourceLinks({ panels }: { panels: Array<{ sourceUrls: string[] }> }) {
  const urls = Array.from(new Set(panels.flatMap((panel) => panel.sourceUrls)));
  if (!urls.length) return null;
  return (
    <section className="archive-sources">
      <h3>原始信号来源</h3>
      {urls.map((url) => <a key={url} href={url} rel="noreferrer" target="_blank">{url}</a>)}
    </section>
  );
}

function Gallery({ title, images, empty }: { title: string; images: string[]; empty?: string }) {
  return (
    <section className="archive-gallery-section">
      <h3>{title}</h3>
      {images.length ? (
        <div className="archive-gallery">
          {images.map((imageUrl, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`${title} ${index + 1}`} loading="lazy" />
          ))}
        </div>
      ) : <p className="muted">{empty}</p>}
    </section>
  );
}
```

- [ ] **Step 4: 新增路由并增加后台入口**

创建 `src/app/archive/page.tsx`：

```tsx
import { ArchivePage } from "@/components/archive-page";
import { listArticleManifestSummaries } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";

export default async function ArchiveRoute() {
  const articles = await listArticleManifestSummaries(60).catch(() => []);
  return <ArchivePage articles={articles} />;
}
```

在 `src/app/admin/page.tsx` 顶部按钮区域增加：

```tsx
<a className="button secondary" href="/archive">
  <Eye size={18} />
  <span style={{ marginLeft: 8 }}>历史归档</span>
</a>
```

- [ ] **Step 5: 增加归档页样式**

在 `src/app/globals.css` 增加：

```css
.archive-page {
  min-height: 100dvh;
  padding: 42px 20px 72px;
}

.archive-header,
.archive-list {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.archive-list {
  display: grid;
  gap: 18px;
  margin-top: 24px;
}

.archive-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 22px;
  background: var(--surface);
}

.archive-card-heading,
.archive-gallery {
  display: flex;
  gap: 14px;
}

.archive-card-heading {
  align-items: flex-start;
  justify-content: space-between;
}

.archive-copy {
  margin-top: 18px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.archive-gallery-section {
  margin-top: 18px;
}

.archive-sources {
  display: grid;
  gap: 6px;
  margin-top: 18px;
}

.archive-gallery {
  overflow-x: auto;
}

.archive-gallery img {
  width: 168px;
  height: 210px;
  border: 1px solid var(--line);
  object-fit: cover;
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```powershell
git add src/components/archive-page.tsx src/app/archive/page.tsx src/app/admin/page.tsx src/app/globals.css tests/admin-ui.test.ts
git commit -m "feat: add visual brief archive page"
```

### Task 4: 锁定每天只展示最后一次结果

**Files:**
- Create: `tests/visual-manifest.test.ts`
- Verify: `src/lib/server/visual-manifest.ts`

- [ ] **Step 1: 写归档去重测试**

创建 `tests/visual-manifest.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicBlobPathnames = vi.hoisted(() => vi.fn());
const getTextBlob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/blob", () => ({
  listPublicBlobPathnames,
  getTextBlob
}));

import { listArticleManifestSummaries } from "@/lib/server/visual-manifest";

describe("article manifest archive", () => {
  beforeEach(() => {
    listPublicBlobPathnames.mockResolvedValue([
      "articles/2026-05-31/manifest.json",
      "articles/2026-05-31/runs/run-old/manifest.json",
      "articles/2026-05-31/runs/run-new/manifest.json",
      "articles/2026-05-30/manifest.json"
    ]);
    getTextBlob.mockImplementation(async (pathname: string) => JSON.stringify({
      date: pathname.includes("2026-05-31") ? "2026-05-31" : "2026-05-30",
      title: "企业 AI 日报",
      subtitle: "过去 24 小时",
      generatedAt: pathname.includes("2026-05-31") ? "2026-05-31T11:00:00.000Z" : "2026-05-30T11:00:00.000Z",
      sourceWindow: "24h",
      panels: [
        { index: 1, kind: "cover", title: "封面", imageUrl: "https://blob.example/1.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 2, kind: "news", title: "主线", imageUrl: "https://blob.example/2.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 3, kind: "news", title: "雷达", imageUrl: "https://blob.example/3.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 4, kind: "takeaway", title: "判断", imageUrl: "https://blob.example/4.png", width: 1080, height: 2000, sourceUrls: [] }
      ]
    }));
  });

  it("lists one stable manifest per day and ignores run manifests", async () => {
    const articles = await listArticleManifestSummaries();
    expect(articles.map((article) => article.date)).toEqual(["2026-05-31", "2026-05-30"]);
    expect(getTextBlob).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 运行测试，确认通过**

Run:

```powershell
npm.cmd run test:run -- tests/visual-manifest.test.ts
```

Expected: PASS。现有 `listArticleManifestSummaries` 已只扫描稳定 `articles/YYYY-MM-DD/manifest.json`，无需修改生产代码。

- [ ] **Step 3: 提交**

```powershell
git add tests/visual-manifest.test.ts
git commit -m "test: keep one archive entry per day"
```

### Task 5: 完整验证与部署

**Files:**
- Verify only.

- [ ] **Step 1: 运行完整测试**

```powershell
npm.cmd run test:run
```

Expected: 全部测试通过。

- [ ] **Step 2: 运行 lint**

```powershell
npm.cmd run lint
```

Expected: 无 ESLint 错误。

- [ ] **Step 3: 运行生产构建**

```powershell
npm.cmd run build
```

Expected: Next.js production build 成功，包含 `/archive` 动态路由。

- [ ] **Step 4: 本地渲染四张 PNG**

使用与 `tests/render-sheet.test.ts` 相同的渲染方法，生成四张临时 PNG，逐张检查：

- 封面标题优先两行。
- 正文右侧接近图片右边缘。
- 图片和文字没有相互覆盖。
- 最右侧没有裁切。

- [ ] **Step 5: 推送并检查 Vercel**

```powershell
git push origin main
```

使用 Vercel MCP 查询项目 `prj_Da90xP14S4IAQEniU8SI57u1srFf`，确认最新生产部署状态为 `READY`。最后请求：

```powershell
Invoke-WebRequest -Uri "https://wechat-auto-articles.vercel.app/archive" -UseBasicParsing
```

Expected: HTTP `200`。
