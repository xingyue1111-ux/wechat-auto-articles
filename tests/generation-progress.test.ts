import { describe, expect, it } from "vitest";
import {
  redactSensitiveText,
  serializeSseEvent,
  type GenerationStreamEvent
} from "@/lib/server/generation-progress";

describe("generation progress protocol", () => {
  it("serializes a progress event as SSE", () => {
    const event: GenerationStreamEvent = {
      type: "log",
      level: "success",
      stage: "aihot",
      message: "AI HOT 抓取完成，共 12 条新闻",
      timestamp: "2026-05-30T03:00:00.000Z"
    };

    expect(serializeSseEvent(event)).toBe(`data: ${JSON.stringify(event)}\n\n`);
  });

  it("redacts bearer tokens and secret-like JSON fields", () => {
    const unsafe =
      'Authorization: Bearer sk-live-secret-token {"api_key":"ark-secret-value","token":"blob-secret-value"}';

    const safe = redactSensitiveText(unsafe);

    expect(safe).not.toContain("sk-live-secret-token");
    expect(safe).not.toContain("ark-secret-value");
    expect(safe).not.toContain("blob-secret-value");
    expect(safe).toContain("[REDACTED]");
  });
});
