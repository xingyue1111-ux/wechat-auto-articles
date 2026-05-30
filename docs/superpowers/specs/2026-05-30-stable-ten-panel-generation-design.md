# Stable Ten-Panel Generation Design

## Goal

Make daily visual brief generation predictable on Vercel Hobby by shortening the Seedream phase, preventing one slow image request from blocking the article, and enforcing a stable ten-panel editorial structure.

## Root Cause

The current implementation generates ten Seedream images sequentially. The production screenshot shows that images 1-8 completed, then image 9 started without a corresponding completion log.

The existing code has no per-image timeout. Ten sequential image calls at roughly 20-30 seconds each can also approach the Vercel Hobby function maximum duration of 300 seconds.

## Seedream Reliability

Generate images with a concurrency limit of three.

For each panel:

1. Start one Seedream request.
2. Abort the request after 75 seconds.
3. Retry once after a short delay.
4. If the second attempt fails, return a local placeholder image for that panel.
5. Emit logs for running, retrying, degraded fallback, and success states.

The full article continues even when one Seedream panel degrades to a placeholder.

## Stable DeepSeek Output

The visual brief uses exactly ten panels:

| Index | Kind | Purpose |
| ---: | --- | --- |
| 1 | `cover` | Cover |
| 2 | `context` | Today's main thread |
| 3 | `news` | Why this matters |
| 4 | `news` | Enterprise workflow impact |
| 5 | `news` | Recommended enterprise action |
| 6 | `news` | Radar item 01 |
| 7 | `news` | Radar item 02 |
| 8 | `news` | Radar item 03 |
| 9 | `takeaway` | Judgment for enterprise AI leaders |
| 10 | `footer` | Closing panel |

The DeepSeek request uses:

- `response_format: { "type": "json_object" }`
- `temperature: 0.2`
- `max_tokens: 5000`
- A structured prompt containing the exact panel contract and an example JSON shape.

The application validates both count and order. If the model output is invalid, empty, truncated, or inconsistent, it falls back to a deterministic ten-panel brief.

## Admin Source List

The admin page shows the five public sources by name:

- AI HOT
- Hacker News
- Hugging Face Daily Papers
- arXiv RSS
- GitHub Releases

## Testing

Add regression tests for:

- Seedream uses at most three concurrent requests.
- Seedream retries one timeout or upstream failure once.
- Seedream returns a placeholder after the second failure.
- DeepSeek sends JSON output configuration, lower temperature, and max tokens.
- Visual brief fallback always contains exactly ten panels in the required order.
- Invalid model panel order falls back to the deterministic template.
- Admin page visibly lists all five public sources.

## Out Of Scope

- Resuming an interrupted generation from Blob checkpoints.
- Per-panel regeneration controls.
- Historical run dashboards.
- Vercel Workflow migration.
