# Enterprise AI Multisource Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four token-free public content sources to AI HOT and turn the daily visual brief into an enterprise AI implementation decision brief.

**Architecture:** Keep each source collector isolated and normalize every source into the existing `NormalizedContentItem` contract. Add an aggregator that runs collectors in parallel, tolerates partial failures, deduplicates, scores enterprise relevance, balances sources, and sends at most 30 candidates into the existing DeepSeek and rendering pipeline.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, `fast-xml-parser`, Vercel Functions, Vercel Blob.

---

## File Structure

- Create `src/lib/content-sources/shared.ts`: shared string, URL, title, deduplication, and relevance helpers.
- Create `src/lib/content-sources/hacker-news.ts`: official Hacker News API collector.
- Create `src/lib/content-sources/hugging-face.ts`: Hugging Face Daily Papers collector.
- Create `src/lib/content-sources/arxiv.ts`: arXiv RSS collector.
- Create `src/lib/content-sources/github-releases.ts`: public GitHub Releases collector and repository catalog.
- Create `src/lib/content-sources/aggregate.ts`: resilient parallel collection and candidate compression.
- Modify `src/lib/server/visual-pipeline.ts`: replace direct AI HOT call with aggregator and update prompt.
- Modify `src/lib/server/generation-progress.ts`: add source-specific stages.
- Modify `src/app/admin/page.tsx`: rename the content source metric to five-source radar.
- Modify `README.md`: document sources and editorial direction.

## Task 1: Add Shared Content Utilities

- [ ] Write failing tests in `tests/content-sources.test.ts` for URL/title deduplication and enterprise scoring.
- [ ] Run `npm.cmd run test:run -- tests/content-sources.test.ts` and confirm missing-module failure.
- [ ] Add `src/lib/content-sources/shared.ts` with `dedupeContentItems`, `scoreEnterpriseRelevance`, and `compressEnterpriseCandidates`.
- [ ] Run the focused tests and confirm they pass.

## Task 2: Add Hacker News And Hugging Face Collectors

- [ ] Add failing normalizer and fetcher tests in `tests/content-sources.test.ts`.
- [ ] Run the focused tests and confirm missing-function failures.
- [ ] Add `src/lib/content-sources/hacker-news.ts` using `https://hacker-news.firebaseio.com/v0/topstories.json` and `item/<id>.json`.
- [ ] Add `src/lib/content-sources/hugging-face.ts` using `https://huggingface.co/api/daily_papers?date=YYYY-MM-DD`.
- [ ] Run the focused tests and confirm they pass.

## Task 3: Add arXiv RSS Collector

- [ ] Install `fast-xml-parser`.
- [ ] Add a failing RSS parsing test in `tests/content-sources.test.ts`.
- [ ] Add `src/lib/content-sources/arxiv.ts` using `https://rss.arxiv.org/rss/cs.AI`, `cs.LG`, and `cs.CL`.
- [ ] Parse RSS through `fast-xml-parser`, normalize entries, and deduplicate cross-category papers.
- [ ] Run the focused tests and confirm they pass.

## Task 4: Add GitHub Releases Radar

- [ ] Add failing catalog and release normalization tests in `tests/content-sources.test.ts`.
- [ ] Add `src/lib/content-sources/github-releases.ts`.
- [ ] Track Tier 1 Coding Agents, Tier 2 Harness infrastructure, and Tier 3 enterprise application repositories in a separate exported catalog.
- [ ] Fetch public releases with `Accept: application/vnd.github+json` and `User-Agent`.
- [ ] Run the focused tests and confirm they pass.

## Task 5: Add Resilient Aggregation

- [ ] Add tests proving one failed source does not stop the run, all failed sources do stop the run, and final candidates are capped at 30.
- [ ] Add `src/lib/content-sources/aggregate.ts` using `Promise.allSettled`.
- [ ] Emit source start, success count, partial failure, merged count, and compressed count events.
- [ ] Run focused tests and confirm they pass.

## Task 6: Wire The Pipeline And Editorial Prompt

- [ ] Modify `src/lib/server/generation-progress.ts` to include `hacker-news`, `hugging-face`, `arxiv`, and `github-releases` stages.
- [ ] Modify `src/lib/server/visual-pipeline.ts` to call the aggregator and map source events into the existing streaming console.
- [ ] Rewrite the DeepSeek instructions around one enterprise implementation main thread plus 3-4 radar items.
- [ ] Modify `src/app/admin/page.tsx` and `README.md` to describe the five-source radar.

## Task 7: Verify And Deploy

- [ ] Run `npm.cmd run test:run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`.
- [ ] Commit implementation changes.
- [ ] Push `main` to GitHub and wait for Vercel deployment status `READY`.
- [ ] Fetch `https://wechat-auto-articles.vercel.app/` and confirm the production entry returns HTTP `200`.
