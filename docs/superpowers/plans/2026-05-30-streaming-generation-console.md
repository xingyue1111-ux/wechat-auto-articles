# Streaming Generation Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VSCode-style SSE output panel that exposes real visual brief generation progress and sanitized upstream errors.

**Architecture:** The existing visual pipeline receives an optional progress reporter. A protected `POST /api/admin/generate-stream` endpoint serializes those events as SSE. The admin client reads the stream, appends terminal rows, and redirects after completion.

**Tech Stack:** Next.js App Router, React, TypeScript, SSE over streamed `fetch`, Vitest.

---

### Task 1: Progress Protocol

**Files:**
- Create: `src/lib/server/generation-progress.ts`
- Test: `tests/generation-progress.test.ts`

- [ ] Write a failing test for SSE serialization and secret redaction.
- [ ] Implement typed log events, SSE serialization, and redaction.
- [ ] Run the focused test.

### Task 2: Pipeline Instrumentation

**Files:**
- Modify: `src/lib/server/visual-pipeline.ts`
- Modify: `src/lib/services/deepseek.ts`
- Modify: `src/lib/services/seedream.ts`

- [ ] Add progress events around every external boundary and long-running loop.
- [ ] Include upstream status code and shortened response body in thrown errors.
- [ ] Run the existing pipeline-related tests.

### Task 3: Authenticated Streaming Route

**Files:**
- Modify: `src/lib/admin/auth.ts`
- Create: `src/app/api/admin/generate-stream/route.ts`

- [ ] Add an API-safe admin session validator.
- [ ] Stream pipeline events and a final redirect event.
- [ ] Return a sanitized terminal error event on failure.

### Task 4: VSCode-Style Output Panel

**Files:**
- Modify: `src/components/generate-brief-form.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/admin-ui.test.ts`

- [ ] Replace the Server Action form with streamed `fetch`.
- [ ] Add status bar, timestamped rows, auto-scroll, retry state, and detailed errors.
- [ ] Run the UI regression test.

### Task 5: Verification And Deployment

- [ ] Run `npm.cmd run test:run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Commit and push to `main`.
- [ ] Confirm the Vercel production deployment is `READY`.
