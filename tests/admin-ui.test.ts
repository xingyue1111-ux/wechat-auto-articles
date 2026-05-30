import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin generation form", () => {
  it("shows pending feedback and prevents duplicate generation requests", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "generate-brief-form.tsx"),
      "utf8"
    );

    expect(source).toContain("useActionState");
    expect(source).toContain("disabled={isPending}");
    expect(source).toContain("生成中，请稍候");
    expect(source).toContain("请勿重复点击");
    expect(source).toContain('role="alert"');
  });
});
