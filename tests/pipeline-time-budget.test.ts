import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("generation pipeline time budget", () => {
  it("bounds DeepSeek and Seedream work so the stream can return a terminal event", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "server", "visual-pipeline.ts"),
      "utf8"
    );

    expect(source).toContain("FUNCTION_TIME_BUDGET_MS");
    expect(source).toContain("remainingTimeBudgetMs");
    expect(source).toContain("requestTimeoutMs:");
    expect(source).toContain("phaseTimeoutMs:");
    expect(source).toContain("skipRemoteSeedream");
  });
});
