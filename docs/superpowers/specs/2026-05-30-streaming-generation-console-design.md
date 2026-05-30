## Streaming Generation Console

### Goal

Replace the single loading spinner with a VSCode-style output panel that streams the real generation progress. When generation fails, keep the completed steps and show the sanitized upstream error response without exposing API keys.

### Architecture

- Add `POST /api/admin/generate-stream` as an authenticated SSE endpoint.
- Keep the existing cron route and pipeline reusable.
- Extend the visual brief pipeline with an optional progress reporter.
- Emit real events for AI HOT fetch, DeepSeek structure generation, Seedream images, Blob persistence, PNG rendering, manifest upload, completion, and errors.
- Use the existing admin session cookie to protect manual generation.

### Interface

The admin page shows a dark output panel inspired by VSCode:

- Timestamped rows with `INFO`, `RUN`, `OK`, and `ERROR` levels.
- A compact status bar showing idle, running, complete, or failed state.
- Auto-scroll while output arrives.
- A retry button after failure.
- Automatic redirect to the generated article after success.

### Error Handling

- Include HTTP status codes and a shortened upstream response body.
- Redact bearer tokens, API keys, and long secret-like values.
- Keep the output visible after a failed run.
- Do not write generation logs to Blob in this iteration.

### Verification

- Unit test SSE serialization and secret redaction.
- Unit test that the admin UI uses the streaming endpoint and exposes a VSCode-style output panel.
- Run the existing test suite, lint, and production build.
