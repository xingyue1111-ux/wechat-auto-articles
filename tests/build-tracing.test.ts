import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel function output tracing", () => {
  it("includes the full Simplified Chinese render fonts in function bundles", async () => {
    const source = await readFile(path.join(process.cwd(), "next.config.ts"), "utf8");

    expect(source).toContain("outputFileTracingIncludes");
    expect(source).toContain("noto-sans-sc-chinese-simplified-400-normal.woff");
    expect(source).toContain("noto-sans-sc-chinese-simplified-700-normal.woff");
    expect(source).toContain("noto-serif-sc-chinese-simplified-700-normal.woff");
  });
});
