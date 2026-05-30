import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin generation form", () => {
  it("streams generation progress into a VSCode-style output panel", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "generate-brief-form.tsx"),
      "utf8"
    );

    expect(source).toContain('/api/admin/generate-stream');
    expect(source).toContain("response.body.getReader()");
    expect(source).toContain('className="output-console"');
    expect(source).toContain("clearLogs");
    expect(source).toContain("window.location.assign(event.redirectUrl)");
  });
});
