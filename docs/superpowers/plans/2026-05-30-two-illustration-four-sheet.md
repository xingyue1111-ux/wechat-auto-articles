# Two-Illustration Four-Sheet Visual Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate only two Seedream illustrations and combine ten editorial panels into four WeChat-ready long images.

**Architecture:** Keep the ten-panel DeepSeek contract unchanged. Add a rendering allocation layer that selects two Seedream prompts, groups editorial panels into four sheets, renders each sheet from in-memory illustration data, and writes a four-image public manifest.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Satori, Resvg, Seedream, Vercel Blob.

---

### Task 1: Two-Illustration Allocation

**Files:**
- Modify: `src/lib/visual-render/illustrations.ts`
- Modify: `tests/illustrations.test.ts`

- [ ] Change `selectIllustrationPrompts()` to select panel prompts `0` and `2`.
- [ ] Remove per-panel illustration allocation because sheets own illustration assignment.
- [ ] Run `npm.cmd run test:run -- tests/illustrations.test.ts`.

### Task 2: Four-Sheet Render Plans

**Files:**
- Create: `src/lib/visual-render/sheet-plan.ts`
- Create: `tests/sheet-plan.test.ts`

- [ ] Add a failing test proving ten panels become four sheets with group sizes `2, 3, 3, 2`.
- [ ] Add `buildVisualBriefSheetPlans()` with fixed panel groups and cover/body illustration allocation.
- [ ] Run `npm.cmd run test:run -- tests/sheet-plan.test.ts`.

### Task 3: Four-Sheet PNG Renderer

**Files:**
- Create: `src/lib/visual-render/render-sheet.tsx`
- Create: `tests/render-sheet.test.ts`

- [ ] Add a failing test proving a grouped sheet renders a PNG buffer.
- [ ] Implement a mobile-first long-image layout with one image slot and multiple editorial sections.
- [ ] Run `npm.cmd run test:run -- tests/render-sheet.test.ts`.

### Task 4: Pipeline And Manifest

**Files:**
- Modify: `src/lib/server/visual-pipeline.ts`
- Modify: `src/lib/visual-brief.ts`
- Modify: `tests/visual-brief.test.ts`
- Modify: `src/app/admin/page.tsx`

- [ ] Render four sheet plans instead of ten individual panel plans.
- [ ] Validate the four-sheet manifest order: `cover`, `news`, `news`, `takeaway`.
- [ ] Change the admin metric to `2 张`.
- [ ] Run `npm.cmd run test:run`.

### Task 5: Verify And Deploy

- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run local generation without paid API keys and confirm HTTP `200`, four output images, first kind `cover`, last kind `takeaway`.
- [ ] Commit and push `main`.
- [ ] Confirm Vercel deployment state is `READY`.
