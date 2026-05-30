# Enterprise AI Multisource Brief Design

## Goal

Upgrade the daily visual brief from a single AI HOT feed into a resilient, token-free, five-source content pool for enterprise AI implementation leaders.

The publication is not a general AI news digest. Its editorial promise is:

> Help enterprise AI leaders understand which changes matter for efficiency, process design, governance, and sustainable Agent adoption.

## Editorial Direction

Each issue uses a "one main thread + 3-4 radar items" structure.

The intended editorial mix is:

| Topic | Target share |
| --- | ---: |
| Harness Engineering: process, context, rules, permissions, verification, retrospectives | 35% |
| General enterprise scenarios: productivity, knowledge, customer service, operations, internal functions | 30% |
| Coding Agents and Vibe Coding as an observable enterprise workflow | 25% |
| Industry cases and major model changes | 10% |

Coding Agents are an important window into Agent adoption, but the publication must not become a developer-only newsletter.

## Sources

All enabled sources work without extra API tokens.

| Source | Role | Maximum raw candidates |
| --- | --- | ---: |
| AI HOT selected feed | Chinese-language hot topics and broad signals | 30 |
| Hacker News official API | Practitioner discussion and product feedback | 15 |
| Hugging Face Daily Papers API | Curated research and model signals | 10 |
| arXiv RSS | Early research trend supplement | 12 |
| GitHub public Releases API | Product and Harness Engineering updates | 20 |

Product Hunt is excluded because it requires an additional token.

## GitHub Radar

GitHub repositories are configured in a separate catalog so the list can evolve without changing ingestion logic.

### Tier 1: Agent Workflows

- `openai/codex`
- `anthropics/claude-code`
- `google-gemini/gemini-cli`
- `sst/opencode`
- `cline/cline`

### Tier 2: Harness Infrastructure

- Model Context Protocol specification and SDK repositories
- Agent skills, hooks, memory, permissions, sandboxing, evaluation, observability, and orchestration projects

### Tier 3: Enterprise Application Tools

- `langgenius/dify`
- `n8n-io/n8n`
- `langchain-ai/langchain`
- `run-llama/llama_index`
- `vercel/ai`

Tier 3 items only enter the compressed candidate set when their release title or notes indicate a meaningful enterprise impact.

## Architecture

Add one isolated collector per external source and a shared aggregator:

```text
AI HOT collector -----------\
Hacker News collector -------\
Hugging Face collector ------- > source aggregator -> filter -> dedupe -> rank -> DeepSeek
arXiv RSS collector ----------/
GitHub Releases collector ---/
```

Each collector returns the existing `NormalizedContentItem` shape. The aggregator runs collectors in parallel with `Promise.allSettled`, logs source-level status, and continues when one source fails.

The aggregator performs:

1. Source-specific limits.
2. URL and title deduplication.
3. Enterprise relevance scoring based on workflow, Agent, governance, security, cost, knowledge, customer service, operations, coding productivity, and Harness Engineering signals.
4. Source diversity balancing.
5. Compression to at most 30 items before DeepSeek.

## Runtime Logs

The existing streaming output console must show:

- Start and completion for each source.
- Candidate count from each source.
- Source-specific failure details without exposing secrets.
- Merged item count after deduplication.
- Final candidate count sent to DeepSeek.

One source failure must not fail the whole run. The run fails only when all sources fail or no usable candidate remains.

## Prompt Update

The DeepSeek prompt changes from a generic AI HOT digest into an enterprise AI implementation brief.

It must request:

1. One main thread that matters to enterprise AI implementation.
2. Three to four deeper panels explaining practical impact.
3. Three to four radar items with concise implementation judgments.
4. A closing panel with one concrete action or question for enterprise AI leaders.

The prompt must explicitly keep Coding Agent and Vibe Coding coverage around 20-30% over time unless a major event justifies a stronger focus.

## Testing

Add tests for:

- Each source normalizer.
- Hacker News item filtering.
- Hugging Face Daily Papers normalization.
- arXiv RSS parsing.
- GitHub release catalog and normalization.
- Aggregator resilience when one source fails.
- Deduplication and enterprise relevance compression.
- Streaming logs for source counts and partial failures.
- Existing Seedream, rendering, Blob manifest, lint, and production build checks.

## Out Of Scope

- Product Hunt integration.
- Database persistence.
- Historical analytics dashboards.
- Full semantic embeddings.
- Per-source LLM analysis Agents.
