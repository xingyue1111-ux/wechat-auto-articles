# Stable Ten-Panel Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Seedream stalls from blocking the full article, enforce a stable ten-panel DeepSeek JSON structure, and list all five public sources in the admin interface.

**Architecture:** Keep the existing pipeline and add bounded concurrency around Seedream requests. Move the visual brief contract into exported prompt and validation helpers so both DeepSeek output and fallback output follow one deterministic ten-panel structure.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, DeepSeek JSON Output, Seedream API, Vercel Functions.

---

## Task 1: Seedream Bounded Concurrency And Fallback

- [ ] Add failing tests in `tests/seedream.test.ts` proving maximum concurrency is three, one failed request retries once, and a second failure returns a placeholder.
- [ ] Run `npm.cmd run test:run -- tests/seedream.test.ts` and confirm expected failures.
- [ ] Modify `src/lib/services/seedream.ts` to use a three-worker pool.
- [ ] Add `AbortSignal.timeout(75_000)`, one retry, a short retry delay, and degraded fallback progress events.
- [ ] Run focused Seedream tests and confirm they pass.

## Task 2: DeepSeek JSON Output Configuration

- [ ] Add a failing request-body test in `tests/deepseek.test.ts`.
- [ ] Run `npm.cmd run test:run -- tests/deepseek.test.ts` and confirm missing JSON output settings.
- [ ] Modify `src/lib/services/deepseek.ts` to send `response_format: { type: "json_object" }`, `temperature: 0.2`, and `max_tokens: 5000`.
- [ ] Run focused DeepSeek tests and confirm they pass.

## Task 3: Deterministic Ten-Panel Visual Brief

- [ ] Add failing tests in `tests/visual-brief.test.ts` for exact panel count and order.
- [ ] Run `npm.cmd run test:run -- tests/visual-brief.test.ts` and confirm the current fallback is too short.
- [ ] Modify `src/lib/visual-brief.ts` to export the required panel order and always construct ten fallback panels.
- [ ] Reject DeepSeek output when panel count or order differs from the contract.
- [ ] Modify `src/lib/server/visual-pipeline.ts` to use a structured fixed-template prompt with an example JSON shape.
- [ ] Run focused visual brief tests and confirm they pass.

## Task 4: Admin Public Source List

- [ ] Add a failing source-list assertion in `tests/admin-ui.test.ts`.
- [ ] Modify `src/app/admin/page.tsx` to display the five source names beneath the source metric.
- [ ] Modify `src/app/globals.css` for a compact responsive source list.
- [ ] Run the admin UI test and confirm it passes.

## Task 5: Verify And Deploy

- [ ] Run `npm.cmd run test:run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`.
- [ ] Commit implementation changes.
- [ ] Push `main` to GitHub and wait for Vercel deployment status `READY`.
- [ ] Fetch `https://wechat-auto-articles.vercel.app/` and confirm HTTP `200`.
