# WeChat HTML Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将公众号主要交付从四张纯图片长图改为可一键复制的原生 HTML 正文，并保留 4 张 Seedream 配图下载和现有四张备用长图。

**Architecture:** 继续复用现有 10 个内部编辑分镜，但把它们改成一篇 1400-1600 字完整文章的排版块，不再作为最终发布表面。新增纯函数 `buildWechatArticleHtml()`，根据归档正文与 4 张 Seedream 原图生成只含内联样式的公众号 HTML。新增受 `/admin` 布局保护的发布工作台，负责预览、一键复制、配图下载和备用长图入口；公开 `/article/YYYY-MM-DD` 页面继续展示备用长图。

**Tech Stack:** Next.js App Router、React、TypeScript、Vercel Blob、Seedream、DeepSeek、Vitest、ESLint

---

## Existing Worktree State

执行前不要创建独立 worktree。当前工作区已有 6 个与本需求重叠的未提交测试文件，它们是本轮 TDD 起点：

- `tests/brief-prompt.test.ts`
- `tests/persist-seedream-image.test.ts`
- `tests/render-layout.test.ts`
- `tests/seedream.test.ts`
- `tests/sheet-plan.test.ts`
- `tests/visual-brief.test.ts`

`next-env.d.ts` 也存在未提交改动。它不属于本需求，不要暂存、覆盖或回退。

## File Structure

- Modify: `src/lib/server/brief-prompt.ts`
  - 将 DeepSeek 契约改为完整文章式 10 块内部结构，正文总量 1400-1600 字。
- Modify: `src/lib/visual-brief.ts`
  - 扩充规则化兜底正文，让备用文章同样满足长度和连续叙事要求。
- Modify: `src/lib/services/seedream.ts`
  - 已配置 Seedream 时，连续失败后中止任务，不再静默使用占位图。
- Modify: `src/lib/server/persist-seedream-image.ts`
  - 下载 Seedream 原图失败时重试一次；仍失败则中止任务。
- Modify: `src/lib/visual-render/sheet-plan.ts`
  - 保存全局分镜编号。
- Modify: `src/lib/visual-render/render-sheet.tsx`
  - 四张备用长图使用全局连续编号。
- Create: `src/lib/wechat-article-html.ts`
  - 将归档正文和 4 张 Seedream 原图转换为简单、可复制的公众号 HTML。
- Create: `tests/wechat-article-html.test.ts`
  - 锁定 HTML 结构、内联样式、图片顺序、缺图降级和转义。
- Create: `src/components/wechat-publishing-workbench.tsx`
  - 展示 HTML 预览、一键复制、复制失败提示、配图下载和备用长图入口。
- Create: `src/app/admin/article/[date]/page.tsx`
  - 读取指定日期 Manifest，渲染受保护的发布工作台。
- Modify: `src/app/api/admin/generate-stream/route.ts`
  - 生成完成后跳转到后台发布工作台。
- Modify: `src/app/admin/page.tsx`
  - 更新生成说明、历史列表文案和后台发布稿入口。
- Modify: `src/components/archive-page.tsx`
  - 将归档中的正文折叠区改成完整文章预览，并保留长图与来源。
- Modify: `src/app/globals.css`
  - 增加公众号文章预览、配图下载和复制状态样式。
- Modify: `tests/admin-ui.test.ts`
  - 锁定后台发布工作台、跳转和归档入口。
- Modify: `journal/2026-06-02.md`
  - 记录本轮实际完成内容、检查结果和真实公众号验收待办。

### Task 1: 锁定基线并保护已有改动

**Files:**
- Verify: `tests/brief-prompt.test.ts`
- Verify: `tests/persist-seedream-image.test.ts`
- Verify: `tests/render-layout.test.ts`
- Verify: `tests/seedream.test.ts`
- Verify: `tests/sheet-plan.test.ts`
- Verify: `tests/visual-brief.test.ts`
- Preserve: `next-env.d.ts`

- [ ] **Step 1: 检查已有改动**

Run:

```powershell
git status --short --branch
git diff -- tests/brief-prompt.test.ts tests/persist-seedream-image.test.ts tests/render-layout.test.ts tests/seedream.test.ts tests/sheet-plan.test.ts tests/visual-brief.test.ts
```

Expected: 6 个测试文件包含已经写好的失败断言；`next-env.d.ts` 保持未暂存。

- [ ] **Step 2: 运行当前基线测试**

Run:

```powershell
npm.cmd run test:run
```

Expected: 6 个测试失败，分别对应完整文章、兜底字数、Seedream 生成失败中止、Seedream 下载失败中止、全局编号计划和全局编号渲染。

- [ ] **Step 3: 不提交基线**

这一任务只确认现状。不要暂存任何文件。

### Task 2: Seedream 连续失败时中止生成

**Files:**
- Modify: `src/lib/services/seedream.ts`
- Modify: `src/lib/server/persist-seedream-image.ts`
- Test: `tests/seedream.test.ts`
- Test: `tests/persist-seedream-image.test.ts`

- [ ] **Step 1: 运行已有失败测试**

Run:

```powershell
npm.cmd run test:run -- tests/seedream.test.ts tests/persist-seedream-image.test.ts
```

Expected: FAIL。当前代码在第二次失败后返回占位图。

- [ ] **Step 2: 修改 Seedream 生成失败处理**

在 `src/lib/services/seedream.ts` 中保留“未配置密钥时使用本地占位图”的开发体验，但将已配置密钥后的最终失败改为抛错：

```ts
type SeedreamProgressStatus = "running" | "retrying" | "failed" | "success";
```

将 `generateOneImage()` 尾部替换为：

```ts
  input.onProgress?.({
    index: input.index,
    total: input.total,
    status: "failed",
    detail: lastError
  });
  throw new Error(`Seedream 配图 ${input.index}/${input.total} 生成失败：${lastError}`);
```

将成功响应改为严格校验 URL：

```ts
      const payload = (await response.json()) as { data?: Array<{ url?: string }> };
      const url = payload.data?.[0]?.url;
      if (!url) {
        throw new Error("Seedream 返回结果缺少图片 URL");
      }
      input.onProgress?.({ index: input.index, total: input.total, status: "success" });
      return {
        prompt: input.prompt,
        url,
        storagePath: storagePath(input.runId, input.index)
      };
```

在 `src/lib/server/visual-pipeline.ts` 中将进度分支从 `degraded` 改为 `failed`：

```ts
      } else if (status === "failed") {
        report("error", "seedream", `Seedream 配图 ${index}/${total} 生成失败`, detail);
```

- [ ] **Step 3: 修改 Seedream 原图下载失败处理**

在 `src/lib/server/persist-seedream-image.ts` 中增加可测试选项：

```ts
export type PersistSeedreamOptions = {
  requestTimeoutMs?: number;
  retryDelayMs?: number;
};
```

将函数签名改为：

```ts
export async function persistSeedreamImageForRender(
  date: string,
  index: number,
  url: string,
  revision?: string,
  options: PersistSeedreamOptions = {}
): Promise<PersistedSeedreamImage> {
```

保留 `data:` URL 直接返回。将远程下载逻辑替换为：

```ts
  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(options.requestTimeoutMs ?? 20_000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "image/png";
      const body = new Uint8Array(await response.arrayBuffer());
      const blob = await putPublicBlob(seedreamBlobPath(date, index, revision), body, contentType);
      return {
        assetUrl: blob.url,
        renderUrl: `data:${contentType};base64,${Buffer.from(body).toString("base64")}`
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === 1 && (options.retryDelayMs ?? 800) > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs ?? 800));
      }
    }
  }
  throw new Error(`Seedream 配图 ${index} 下载失败：${lastError}`);
```

删除不再使用的 `placeholderRenderUrl()`。

- [ ] **Step 4: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/seedream.test.ts tests/persist-seedream-image.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/lib/services/seedream.ts src/lib/server/persist-seedream-image.ts src/lib/server/visual-pipeline.ts tests/seedream.test.ts tests/persist-seedream-image.test.ts
git commit -m "fix: abort incomplete seedream runs"
```

### Task 3: 让四张备用长图使用全局连续编号

**Files:**
- Modify: `src/lib/visual-render/sheet-plan.ts`
- Modify: `src/lib/visual-render/render-sheet.tsx`
- Test: `tests/sheet-plan.test.ts`
- Test: `tests/render-layout.test.ts`

- [ ] **Step 1: 运行已有失败测试**

Run:

```powershell
npm.cmd run test:run -- tests/sheet-plan.test.ts tests/render-layout.test.ts
```

Expected: FAIL。当前每张长图都从 `01` 重新编号。

- [ ] **Step 2: 在长图计划中保存原始分镜编号**

在 `src/lib/visual-render/sheet-plan.ts` 的 `VisualBriefSheetPlan` 增加：

```ts
  panelNumbers: number[];
```

在 `buildVisualBriefSheetPlans()` 返回对象中增加：

```ts
      panelNumbers: group.panelIndexes,
```

- [ ] **Step 3: 渲染时使用全局编号**

在 `src/lib/visual-render/render-sheet.tsx` 中修改封面上下文块：

```tsx
<EditorialBlock panel={context} index={plan.panelNumbers[1] + 1} compact />
```

修改 `AnalysisSheet` 中的映射：

```tsx
{plan.panels.map((panel, index) => (
  <EditorialBlock
    key={`${panel.kind}-${index}`}
    panel={panel}
    index={plan.panelNumbers[index] + 1}
  />
))}
```

修改 `RadarSheet` 中的映射，并保留 `radar` 属性：

```tsx
{plan.panels.map((panel, index) => (
  <EditorialBlock
    key={`${panel.kind}-${index}`}
    panel={panel}
    index={plan.panelNumbers[index] + 1}
    radar
  />
))}
```

- [ ] **Step 4: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/sheet-plan.test.ts tests/render-layout.test.ts tests/render-sheet.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/lib/visual-render/sheet-plan.ts src/lib/visual-render/render-sheet.tsx tests/sheet-plan.test.ts tests/render-layout.test.ts
git commit -m "fix: keep global story numbers across sheets"
```

### Task 4: 将 DeepSeek 输出改为完整文章式分镜

**Files:**
- Modify: `src/lib/server/brief-prompt.ts`
- Modify: `src/lib/visual-brief.ts`
- Modify: `src/lib/server/visual-pipeline.ts`
- Test: `tests/brief-prompt.test.ts`
- Test: `tests/visual-brief.test.ts`
- Test: `tests/deepseek-brief.test.ts`

- [ ] **Step 1: 运行已有失败测试**

Run:

```powershell
npm.cmd run test:run -- tests/brief-prompt.test.ts tests/visual-brief.test.ts tests/deepseek-brief.test.ts
```

Expected: FAIL。当前提示词仍要求雷达短文案，兜底正文只有约 473 个字符。

- [ ] **Step 2: 修改 DeepSeek 编辑约束**

在 `src/lib/server/brief-prompt.ts` 中保留 JSON `panels` 契约，但将 10 屏定义为内部文章排版块。替换提示词中的硬约束与结构说明：

```ts
## 输出硬约束
- 只输出一个 JSON 对象。
- panels 必须恰好包含 10 项，不得增加、删除或调换顺序。
- 每一屏的 kind 必须严格匹配下方结构。
- 10 个 panels 是一篇完整文章的内部排版块，不是 10 条并列新闻。
- panels 的 body 合计必须达到 1400-1600 个中文字符。
- 正文必须围绕一个核心判断连续叙事，前后自然衔接，不得写成互不相关的信号列表。
- 素材允许时，核心主线必须综合至少 2 个独立来源，不得只改写单条新闻。
- 标题、摘要和正文必须全部使用简体中文。即使输入素材是英文，也必须先翻译为简体中文。
- kicker 可以保留少量固定英文栏目名，但任何面向读者的信息不得直接照搬英文新闻标题或英文摘要。
- imagePrompt 必须是英文 Seedream 构图描述，不包含可读文字。系统会统一追加复古未来主义杂志风格。
- sourceUrls 只能使用输入素材中的 URL。
- 不复制任何公众号 IP、人物角色或既有文章版式细节。

## 完整文章结构
01-cover：kind 为 "cover"，文章标题和一句摘要。
02-context：kind 为 "context"，导语，解释为什么今天值得关注。
03-news：kind 为 "news"，第一部分“发生了什么”。
04-news：kind 为 "news"，延续第一部分，补充关键事实。
05-news：kind 为 "news"，第二部分“为什么重要”。
06-news：kind 为 "news"，延续第二部分，解释企业影响。
07-news：kind 为 "news"，第三部分“企业应该怎么判断和行动”。
08-news：kind 为 "news"，延续第三部分，给出执行建议。
09-takeaway：kind 为 "takeaway"，总结判断与行动建议。
10-footer：kind 为 "footer"，简短校对提醒和来源说明。
```

更新系统提示词中的最后一句：

```ts
文字要口语化但克制。输出必须是一篇完整文章的连续叙事。`;
```

- [ ] **Step 3: 增加正文长度校验**

在 `src/lib/visual-brief.ts` 中，将 `normalizeVisualBriefWithDiagnostics()` 的判断改为：

```ts
    if (!parsed.title || !hasRequiredPanelOrder(panels) || !hasValidWechatArticleLength(panels)) {
      return {
        brief: buildFallbackVisualBrief(context),
        usedFallback: true,
        reason: "DeepSeek JSON 缺少标题、没有严格返回固定 10 屏结构，或正文不在 1400-1600 字范围内"
      };
    }
```

增加：

```ts
export function countWechatArticleCharacters(panels: VisualBriefPanelDraft[]): number {
  return panels.flatMap((panel) => panel.body).join("").length;
}

function hasValidWechatArticleLength(panels: VisualBriefPanelDraft[]): boolean {
  const length = countWechatArticleCharacters(panels);
  return length >= 1400 && length <= 1600;
}
```

在 `tests/deepseek-brief.test.ts` 中导入兜底构造器：

```ts
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
```

将 `validBrief()` 改为使用满足长度规则的固定兜底分镜：

```ts
function validBrief() {
  const brief = buildFallbackVisualBrief({
    date: "2026-05-31",
    sourceWindow: "24h",
    items: [item()]
  });
  return {
    title: "\u4f01\u4e1a AI \u4fe1\u53f7\u56fe",
    subtitle: "\u8fc7\u53bb 24 \u5c0f\u65f6",
    panels: brief.panels
  };
}
```

- [ ] **Step 4: 扩充规则化兜底文章**

在 `src/lib/visual-brief.ts` 的 `buildFallbackVisualBrief()` 中，把现有短句扩展成完整文章。使用现有 `mainTitle`、`mainSummary` 和 `windowLabel`，让 10 个 `body` 合计稳定落在 1400-1600 字之间。

在 `mainSummary` 下方增加明确的正文数组：

```ts
const fallbackBodies = [
  [
    `从${windowLabel}的公开信号里，可以看到企业 AI 正在进入一个更务实的阶段。团队不再只讨论模型参数和演示效果，而是开始关心一件更具体的事：这些能力能不能稳定地放进真实流程，持续节省时间，并且在出错时被快速发现。`
  ],
  [
    "今天最值得关注的，不是又出现了一个新工具，而是企业判断标准正在改变。过去大家习惯问模型能做什么，现在更需要问任务由谁发起、资料从哪里来、哪些动作允许自动执行、结果由谁验收，以及失败后怎样恢复。",
    mainSummary.slice(0, 100)
  ],
  [
    "这条变化值得关注，不是因为它又增加了一个新功能，而是因为企业开始把模型能力放进真实流程。过去很多团队停留在演示阶段：能回答问题、能生成内容、能调用少量工具，但一旦进入稳定交付，就会遇到上下文不完整、权限边界不清楚、结果无法复核等问题。",
    "当流程只有一两次演示时，这些问题容易被忽略。真正开始日常使用后，任何一次资料遗漏、权限越界或错误输出，都会增加人工检查成本。企业要解决的不是单次效果，而是连续运行时的可靠性。"
  ],
  [
    "真正的变化发生在工作方式上。企业不再只问模型聪不聪明，而是开始追问任务是否可拆分、输入是否稳定、操作是否留痕、异常是否会被拦截。只有这些问题被回答，Agent 才不是一次性的演示，而是可以持续运行的生产能力。"
  ],
  [
    "这也是为什么 Harness Engineering 变得重要。模型只是系统的一部分，外层还需要明确的上下文、工具接口、权限控制、日志和验收标准。很多效果差异，并不来自更换模型，而来自是否把任务拆清楚、把输入准备好、把结果检查机制放在正确的位置。",
    "一个稳定系统还需要知道什么时候不要自动执行。涉及外部发布、资金、客户数据或高风险判断时，保留人工确认不是效率低，而是必要的责任边界。自动化的价值来自减少重复工作，不是取消所有判断。"
  ],
  [
    "对企业来说，这会改变投入顺序。与其一开始追求覆盖所有部门，不如先选一个高频、规则清楚、结果容易检查的流程。先把人工做法写清楚，再让 Agent 接管其中可验证的一段。这样才能知道效率提升来自哪里，也能在出错时快速定位。"
  ],
  [
    "落地时需要同时看三件事：第一，任务是否重复发生；第二，输入和权限是否可控；第三，输出是否能被明确验收。如果一个场景无法说明什么叫做正确结果，就不适合直接自动化。先补齐标准，再谈规模化，通常会更快。",
    "衡量结果时也要克制。不要只看完成了多少任务，还要看人工复核用了多久、哪些错误反复出现、是否产生新的沟通成本。只有把这些数字留下来，团队才知道下一轮应该优化模型、流程还是输入资料。"
  ],
  [
    "下一步可以从一个两周试验开始。选一个真实流程，记录人工耗时、返工次数和常见错误；让 Agent 只处理边界明确的部分；保留人工审核；每周复盘失败案例。试验结束后，再决定扩大范围、继续调整，还是暂停投入。",
    "如果试验没有明显收益，也要允许及时停止。暂停不是失败，而是说明当前场景、数据或流程还没有准备好。把原因记录下来，通常比勉强扩大范围更有价值。"
  ],
  [
    "判断一个试验值不值得扩大，不要只看生成速度。还要看返工是否减少、责任是否清楚、异常是否可追踪、团队是否愿意持续使用。只有这些指标同时改善，自动化才真正变成组织能力，而不是一次漂亮的演示。",
    "热点每天都会变化，但企业真正需要积累的是稳定方法。把新闻沉淀成场景、动作、权限和验收标准，再通过小范围试验持续修正，才更容易把 AI 变成可复用的生产力。"
  ],
  [
    "本期内容来自公开信号的自动整理。发布前仍需人工校对事实、链接和措辞，并根据团队实际情况调整行动建议。"
  ]
];
```

将原有 10 个 panel 的 `body` 依次改为 `fallbackBodies[0]` 到 `fallbackBodies[9]`。不要用 `.repeat()` 机械灌字。

- [ ] **Step 5: 运行长度断言**

在 `tests/visual-brief.test.ts` 的现有兜底字数测试中保留：

```ts
expect(bodyLength).toBeGreaterThanOrEqual(1400);
expect(bodyLength).toBeLessThanOrEqual(1600);
```

Run:

```powershell
npm.cmd run test:run -- tests/visual-brief.test.ts tests/deepseek-brief.test.ts
```

Expected: PASS。

- [ ] **Step 6: 更新生成日志文案**

在 `src/lib/server/visual-pipeline.ts` 中将 DeepSeek 日志改为：

```ts
report("running", "deepseek", "调用 DeepSeek 分类素材，并生成 1400-1600 字完整公众号文章");
```

成功日志改为：

```ts
`DeepSeek 已完成分类、选题与完整文章生成，共 ${brief.panels.length} 个内部排版块`
```

- [ ] **Step 7: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/brief-prompt.test.ts tests/visual-brief.test.ts tests/deepseek-brief.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交**

```powershell
git add src/lib/server/brief-prompt.ts src/lib/visual-brief.ts src/lib/server/visual-pipeline.ts tests/brief-prompt.test.ts tests/visual-brief.test.ts tests/deepseek-brief.test.ts
git commit -m "feat: generate continuous wechat article copy"
```

### Task 5: 新增公众号 HTML 渲染器

**Files:**
- Create: `src/lib/wechat-article-html.ts`
- Create: `tests/wechat-article-html.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/wechat-article-html.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildWechatArticleHtml } from "@/lib/wechat-article-html";
import type { VisualBriefManifest } from "@/lib/domain/types";

describe("wechat article html", () => {
  it("renders simple inline html with four illustrations in reading order", () => {
    const html = buildWechatArticleHtml(manifest());

    expect(html).toContain("<h1");
    expect(html).toContain("企业 AI 正在进入稳定交付阶段");
    expect(html).toContain("<blockquote");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html.match(/<img/g)).toHaveLength(4);
    expect(html.indexOf("https://blob.example/1.png")).toBeLessThan(html.indexOf("https://blob.example/2.png"));
    expect(html.indexOf("https://blob.example/2.png")).toBeLessThan(html.indexOf("https://blob.example/3.png"));
    expect(html.indexOf("https://blob.example/3.png")).toBeLessThan(html.indexOf("https://blob.example/4.png"));
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
});
```

在同一文件增加固定数据：

```ts
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/wechat-article-html.test.ts
```

Expected: FAIL，因为渲染器尚不存在。

- [ ] **Step 3: 创建 HTML 渲染器**

创建 `src/lib/wechat-article-html.ts`。使用简单内联样式，不引用外部 CSS：

```ts
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
    `<section style="margin:0 auto;max-width:677px;color:#17211f;font-size:16px;line-height:1.85;">`,
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
    `</section>`
  ].join("");
}

function paragraphHtml(lines: string[]): string {
  return lines.map((line) => `<p style="margin:0 0 16px;">${escapeHtml(line)}</p>`).join("");
}

function headingHtml(text: string): string {
  return `<h2 style="margin:28px 0 14px;border-left:4px solid #0f766e;padding-left:10px;font-size:21px;line-height:1.45;">${escapeHtml(text)}</h2>`;
}

function imageHtml(url: string | undefined, alt: string): string {
  return url
    ? `<p style="margin:22px 0;text-align:center;"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" style="display:block;width:100%;height:auto;" /></p>`
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
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
```

- [ ] **Step 4: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/wechat-article-html.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/lib/wechat-article-html.ts tests/wechat-article-html.test.ts
git commit -m "feat: render copyable wechat article html"
```

### Task 6: 增加后台发布工作台

**Files:**
- Create: `src/components/wechat-publishing-workbench.tsx`
- Create: `src/app/admin/article/[date]/page.tsx`
- Modify: `src/app/api/admin/generate-stream/route.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/admin-ui.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/admin-ui.test.ts` 增加：

```ts
it("provides a protected wechat publishing workbench", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "components", "wechat-publishing-workbench.tsx"),
    "utf8"
  );

  expect(source).toContain("一键复制公众号正文");
  expect(source).toContain("navigator.clipboard.write");
  expect(source).toContain("ClipboardItem");
  expect(source).toContain('document.execCommand("copy")');
  expect(source).toContain("下载图");
  expect(source).toContain("备用长图");
});

it("redirects completed generation to the publishing workbench", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "api", "admin", "generate-stream", "route.ts"),
    "utf8"
  );

  expect(source).toContain("`/admin/article/${manifest.date}`");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts
```

Expected: FAIL，因为后台发布工作台尚不存在。

- [ ] **Step 3: 创建客户端发布组件**

创建 `src/components/wechat-publishing-workbench.tsx`：

```tsx
"use client";

import { useRef, useState } from "react";
import type { VisualBriefManifest } from "@/lib/domain/types";

export function WechatPublishingWorkbench({
  manifest,
  html
}: {
  manifest: VisualBriefManifest;
  html: string;
}) {
  const previewRef = useRef<HTMLElement>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  async function copyWechatArticle() {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([previewRef.current?.innerText ?? ""], { type: "text/plain" })
          })
        ]);
      } else {
        copyRenderedPreview(previewRef.current);
      }
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <main className="publishing-page">
      <header className="publishing-header">
        <div>
          <p className="eyebrow">WeChat Publishing Workbench</p>
          <h1>{manifest.title}</h1>
          <p className="muted">复制正文后粘贴到公众号编辑器。发布前检查 4 张配图是否正常显示。</p>
        </div>
        <a className="button secondary" href="/admin">返回生成台</a>
      </header>

      <section className="publishing-actions">
        <button type="button" onClick={copyWechatArticle}>一键复制公众号正文</button>
        <a className="button secondary" href={`/article/${manifest.date}`}>查看备用长图</a>
        {copyStatus === "success" ? <p className="form-note">已复制。请粘贴到公众号编辑器并检查配图。</p> : null}
        {copyStatus === "error" ? <p className="form-error">复制失败。请手动选择下方预览内容复制。</p> : null}
      </section>

      <section className="publishing-layout">
        <article
          className="wechat-article-preview"
          ref={previewRef}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <aside className="publishing-assets">
          <h2>Seedream 配图</h2>
          {(manifest.illustrations ?? []).map((image) => (
            <a
              className="button secondary compact"
              href={image.imageUrl}
              download={`wechat-${manifest.date}-image-${String(image.index).padStart(2, "0")}.png`}
              target="_blank"
              rel="noreferrer"
              key={image.index}
            >
              下载图 {image.index}
            </a>
          ))}
          <h2>备用长图</h2>
          {manifest.panels.map((panel) => (
            <a className="button secondary compact" href={panel.imageUrl} target="_blank" rel="noreferrer" key={panel.index}>
              打开长图 {panel.index}
            </a>
          ))}
        </aside>
      </section>
    </main>
  );
}

function copyRenderedPreview(preview: HTMLElement | null) {
  if (!preview) throw new Error("文章预览不存在");
  const range = document.createRange();
  range.selectNodeContents(preview);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  if (!copied) throw new Error("浏览器拒绝复制");
}
```

- [ ] **Step 4: 创建受保护后台路由**

创建 `src/app/admin/article/[date]/page.tsx`：

```tsx
import { notFound } from "next/navigation";
import { WechatPublishingWorkbench } from "@/components/wechat-publishing-workbench";
import { readArticleManifest } from "@/lib/server/visual-manifest";
import { buildWechatArticleHtml } from "@/lib/wechat-article-html";

export const dynamic = "force-dynamic";

export default async function AdminArticlePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const manifest = await readArticleManifest(date);
  if (!manifest) notFound();
  return <WechatPublishingWorkbench manifest={manifest} html={buildWechatArticleHtml(manifest)} />;
}
```

- [ ] **Step 5: 调整生成跳转和后台历史入口**

在 `src/app/api/admin/generate-stream/route.ts` 中改为：

```ts
redirectUrl: `/admin/article/${manifest.date}`,
```

在 `src/app/admin/page.tsx` 中：

```tsx
<h1>公众号文章生成台</h1>
<p className="muted">聚合五路公开信号，生成完整公众号正文、4 张 Seedream 配图和 4 张备用长图。</p>
```

立即生成区域说明改为：

```tsx
<p className="muted">生成过程会抓取新闻、调用 DeepSeek 生成完整文章、调用 Seedream 生成配图，再输出可复制正文和备用 PNG 长图。</p>
```

历史列表按钮和说明改为：

```tsx
<small>公众号 HTML · 4 张配图 · 4 张备用长图</small>
```

```tsx
<a className="button secondary compact" href={`/admin/article/${article.date}`}>
  <Eye size={16} />
  <span>查看发布稿</span>
</a>
```

- [ ] **Step 6: 增加工作台样式**

在 `src/app/globals.css` 增加：

```css
.publishing-page {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

.publishing-header,
.publishing-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.publishing-actions {
  margin: 18px 0;
  justify-content: flex-start;
}

.publishing-layout {
  display: grid;
  grid-template-columns: minmax(0, 760px) 240px;
  gap: 20px;
  align-items: start;
}

.wechat-article-preview,
.publishing-assets {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
  padding: 22px;
}

.publishing-assets {
  display: grid;
  gap: 10px;
}

.publishing-assets h2 {
  margin: 10px 0 0;
}

@media (max-width: 820px) {
  .publishing-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts tests/wechat-article-html.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交**

```powershell
git add src/components/wechat-publishing-workbench.tsx src/app/admin/article/[date]/page.tsx src/app/api/admin/generate-stream/route.ts src/app/admin/page.tsx src/app/globals.css tests/admin-ui.test.ts
git commit -m "feat: add wechat publishing workbench"
```

### Task 7: 调整归档页为完整文章预览

**Files:**
- Modify: `src/components/archive-page.tsx`
- Modify: `tests/admin-ui.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/admin-ui.test.ts` 的归档测试中增加：

```ts
expect(source).toContain("公众号完整正文");
expect(source).toContain('href={`/admin/article/${article.date}`}');
expect(source).toContain("查看发布稿");
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts
```

Expected: FAIL，因为归档页仍然使用“查看推文内容”和“查看长图”作为主要入口。

- [ ] **Step 3: 调整归档文案与入口**

在 `src/components/archive-page.tsx` 中：

```tsx
<a className="button secondary compact" href={`/admin/article/${article.date}`}>
  <Images size={16} />
  <span>查看发布稿</span>
</a>
```

将正文折叠区标题改为：

```tsx
<summary>公众号完整正文</summary>
```

保留 `Seedream 原始配图`、`最终公众号长图` 和 `原始信号来源`。

- [ ] **Step 4: 运行测试**

Run:

```powershell
npm.cmd run test:run -- tests/admin-ui.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/components/archive-page.tsx tests/admin-ui.test.ts
git commit -m "feat: link archives to wechat publishing drafts"
```

### Task 8: 完整检查和真实发布验收

**Files:**
- Modify: `journal/2026-06-02.md`
- Verify only: all implementation files

- [ ] **Step 1: 运行完整测试**

Run:

```powershell
npm.cmd run test:run
```

Expected: 全部测试通过。

- [ ] **Step 2: 运行 lint**

Run:

```powershell
npm.cmd run lint
```

Expected: 无 ESLint 错误。

- [ ] **Step 3: 运行生产构建**

Run:

```powershell
npm.cmd run build
```

Expected: Next.js production build 成功，路由中包含 `/admin/article/[date]`。

- [ ] **Step 4: 本地浏览器检查**

启动开发服务器：

```powershell
npm.cmd run dev
```

使用 Browser 插件打开 `/admin`，生成一次本地文章并进入 `/admin/article/YYYY-MM-DD`。确认：

- 页面显示完整文章预览。
- 页面显示“一键复制公众号正文”。
- 页面显示 4 个配图下载入口。
- 页面显示 4 个备用长图入口。
- 点击复制后出现成功提示。
- 公开 `/article/YYYY-MM-DD` 仍然显示四张备用长图。

- [ ] **Step 5: 追加实际检查结果**

在现有 `journal/2026-06-02.md` 末尾追加：

```md
### 实施完成内容
- 将公众号主要交付改为可复制 HTML 正文。
- 保留 4 张 Seedream 配图下载和 4 张备用长图。
- Seedream 已配置时，生成或下载连续失败会中止任务。

### 实施检查结果
- `npm.cmd run test:run`
- `npm.cmd run lint`
- `npm.cmd run build`
- 本地后台发布工作台检查

### 待人工验收
- 将 HTML 正文粘贴到公众号编辑器。
- 提交发布一篇测试文章。
- 使用正式文章链接确认文字和 4 张图片仍然可见。
- 若外部图片未被公众号稳定接管，使用后台下载入口手动替换图片后再次发布。
```

- [ ] **Step 6: 提交日志**

```powershell
git add journal/2026-06-02.md
git commit -m "docs: record wechat html publishing verification"
```

- [ ] **Step 7: 人工公众号发布验收**

这一步需要用户操作微信公众号后台。验收完成前，不要把“公众号正式发布稳定”标记为完成。

1. 在后台点击“一键复制公众号正文”。
2. 粘贴到公众号编辑器。
3. 确认正文、小标题、引用框、分隔线和 4 张图片可见。
4. 提交发布测试文章。
5. 打开正式文章链接，确认正文和图片仍然可见。
6. 如果外部图片失效，下载对应图片并在公众号编辑器中手动替换，再重复发布验证。
