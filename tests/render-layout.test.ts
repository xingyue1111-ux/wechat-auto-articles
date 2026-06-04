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

  it("lets cover headlines use the available width before wrapping", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain("<WrappedLines text={cover.title} maxUnits={20} />");
  });

  it("aligns editorial copy close to the image right edge", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain("const contentWidth = radar ? 842 : 864");
    expect(source).toContain("gap: 12");
    expect(source).toContain("paddingRight: 12");
  });

  it("shows wide Seedream images without cropping", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain('objectFit: "contain"');
    expect(source).not.toContain('objectFit: "cover"');
  });

  it("renders exactly one illustration frame on each of the four long-image sheets", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source.match(/<EditorialImageFrame/g)).toHaveLength(4);
  });

  it("uses global story numbers instead of restarting on each sheet", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain("plan.panelNumbers[index]");
    expect(source).not.toContain("index={index + 1}");
  });

  it("uses mobile-readable body copy close to subheading size", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "visual-render", "render-sheet.tsx"),
      "utf8"
    );

    expect(source).toContain("const BODY_COPY_FONT_SIZE = 40");
    expect(source).toContain("const BODY_COPY_LARGE_FONT_SIZE = 44");
    expect(source).not.toContain("fontSize: large ? 33 : 28");
  });
});
