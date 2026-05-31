import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("magazine sheet layout", () => {
  it("keeps all reader-facing text outside image frames", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).not.toContain("<Header index={plan.index} inverse />");
    expect(source).not.toContain("position: \"absolute\"");
    expect(source).toContain("<EditorialImageFrame");
  });

  it("reserves a fixed safe width for editorial copy", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain("contentWidth");
    expect(source).toContain("paddingRight: 24");
  });
});
