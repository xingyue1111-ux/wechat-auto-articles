import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSeedreamImages } from "@/lib/services/seedream";

describe("Seedream image generation", () => {
  const originalApiKey = process.env.ARK_API_KEY;
  const originalModel = process.env.ARK_SEEDREAM_MODEL;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ARK_API_KEY = originalApiKey;
    process.env.ARK_SEEDREAM_MODEL = originalModel;
  });

  it("requests a Seedream wide image suitable for 2.35:1 editorial frames", async () => {
    let requestBody: Record<string, unknown> | undefined;
    process.env.ARK_API_KEY = "test-api-key";
    process.env.ARK_SEEDREAM_MODEL = "test-model";
    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ data: [{ url: "https://example.com/generated.png" }] });
    });

    await generateSeedreamImages({ runId: "2026-05-30", prompts: ["retro futuristic AI newsroom"] });

    expect(requestBody?.size).toBe("3136x1344");
  });

  it("generates at most three images concurrently", async () => {
    process.env.ARK_API_KEY = "test-api-key";
    process.env.ARK_SEEDREAM_MODEL = "test-model";
    let active = 0;
    let maxActive = 0;
    vi.stubGlobal("fetch", async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return Response.json({ data: [{ url: "https://example.com/generated.png" }] });
    });

    await generateSeedreamImages({
      runId: "2026-05-30",
      prompts: Array.from({ length: 8 }, (_, index) => `prompt ${index}`)
    });

    expect(maxActive).toBe(3);
  });

  it("retries once and falls back to a placeholder after a second generation failure", async () => {
    process.env.ARK_API_KEY = "test-api-key";
    process.env.ARK_SEEDREAM_MODEL = "test-model";
    let attempts = 0;
    const statuses: string[] = [];
    vi.stubGlobal("fetch", async () => {
      attempts += 1;
      return Response.json({ error: { message: "upstream unavailable" } }, { status: 503 });
    });

    const images = await generateSeedreamImages({
      runId: "2026-05-30",
      prompts: ["prompt"],
      retryDelayMs: 0,
      onProgress: (event) => statuses.push(event.status)
    });

    expect(attempts).toBe(2);
    expect(statuses).toContain("failed");
    expect(images[0].url).toContain("data:image/svg+xml;base64");
  });

  it("sends an abort signal with every Seedream request", async () => {
    process.env.ARK_API_KEY = "test-api-key";
    process.env.ARK_SEEDREAM_MODEL = "test-model";
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal;
      return Response.json({ data: [{ url: "https://example.com/generated.png" }] });
    });

    await generateSeedreamImages({ runId: "2026-05-30", prompts: ["prompt"] });

    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
