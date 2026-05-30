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

  it("requests a Seedream 5 compatible 2048x2048 image", async () => {
    let requestBody: Record<string, unknown> | undefined;
    process.env.ARK_API_KEY = "test-api-key";
    process.env.ARK_SEEDREAM_MODEL = "test-model";
    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ data: [{ url: "https://example.com/generated.png" }] });
    });

    await generateSeedreamImages({ runId: "2026-05-30", prompts: ["retro futuristic AI newsroom"] });

    expect(requestBody?.size).toBe("2048x2048");
  });
});
