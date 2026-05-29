# WeChat Auto Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cloud-hosted 7-agent WeChat official account operations pipeline that automatically collects AI HOT content, analyzes it, selects a topic, drafts, reviews, lays out, generates images, publishes previews, and archives after manual publication.

**Architecture:** Next.js on Vercel provides the admin console, cron route, and job execution routes. Supabase stores content, jobs, drafts, review reports, assets, publication records, and retrospective logs. External model clients are isolated behind service modules so the system can be tested without real API keys.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Vercel Cron, Vitest, DeepSeek V4 Pro, DashScope Qwen embeddings, Volcengine Ark Seedream.

---

## Summary

- Runtime: cloud-first on Vercel.
- Database and storage: Supabase.
- Admin access: single administrator password.
- Cron: `0 11 * * *` UTC, equivalent to 19:00 Asia/Shanghai.
- Data source: AI HOT REST API first, RSS only as a future fallback.
- Notifications: admin dashboard only.
- Publishing: user manually publishes in WeChat, then clicks "Published" in the admin console.

## Key Changes

- Create a Next.js app with a dashboard for runs, content pool, cluster reports, drafts, review status, preview links, and publication records.
- Add Supabase schema for `content_items`, `content_embeddings`, `clusters`, `article_runs`, `agent_jobs`, `drafts`, `review_reports`, `assets`, `published_articles`, and `retrospectives`.
- Implement 7 agent modules:
  - Agent1 collects selected AI HOT items with cursor pagination and dedupes them.
  - Agent2 embeds and clusters all content by category and semantic similarity.
  - Agent3 ranks clusters, picks the best one, writes three title candidates, and opens the creation run.
  - Agent4 writes a 1200-1800 Chinese article for enterprise AI implementers.
  - Agent5 scores five learning-effectiveness dimensions and automatically revises up to two rounds.
  - Agent6 generates five Seedream prompts, image assets, mobile-width HTML, and long-image slice metadata.
  - Agent7 marks the article published, records the WeChat URL, syncs the article list, and writes a retrospective.
- Add job orchestration routes so each agent completion enqueues the next agent instead of running one long request.
- Add Vercel Cron configuration with `CRON_SECRET` authorization.

## Test Plan

- Unit test AI HOT normalization, pagination dedupe, cosine similarity, clustering, job transitions, review thresholds, image prompt generation, HTML escaping, and long-image slice planning.
- Integration test a mocked full run from Agent1 through Agent7 with in-memory storage.
- Build check with `npm.cmd run build`.
- Local smoke test with `npm.cmd run dev` after killing the chosen port first.

## Assumptions

- The production system will receive real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `CRON_SECRET`, `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`, `ARK_API_KEY`, `ARK_SEEDREAM_MODEL`, and `PUBLIC_APP_URL` values after implementation.
- The first version does not auto-publish to WeChat.
- The first version does not send Feishu, WeCom, or email notifications.
- If Vercel Hobby cron drifts inside the target hour, that is acceptable.
- If Agent5 remains below 4.2 after two automatic revision rounds, the run is marked `needs_human`.
