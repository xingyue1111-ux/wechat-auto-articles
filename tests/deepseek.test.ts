import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithDeepSeek } from "@/lib/services/deepseek";

describe("DeepSeek visual brief generation", () => {
  const originalApiKey = process.env.DEEPSEEK_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.DEEPSEEK_API_KEY = originalApiKey;
  });

  it("requests deterministic JSON output for the visual brief", async () => {
    let requestBody: Record<string, unknown> | undefined;
    process.env.DEEPSEEK_API_KEY = "test-api-key";
    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ choices: [{ message: { content: "{\"title\":\"brief\"}" } }] });
    });

    await generateWithDeepSeek({ system: "Output json", prompt: "Build brief json", fallback: "{}" });

    expect(requestBody?.response_format).toEqual({ type: "json_object" });
    expect(requestBody?.temperature).toBe(0.2);
    expect(requestBody?.max_tokens).toBe(5000);
  });
});
