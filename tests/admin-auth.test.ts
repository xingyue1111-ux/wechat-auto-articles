import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin authentication hardening", () => {
  it("does not allow production admin access when ADMIN_PASSWORD is missing", async () => {
    const source = await readFile(path.join(process.cwd(), "src", "lib", "admin", "auth.ts"), "utf8");

    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).not.toContain("if (!expected) {\n    return true;");
  });

  it("does not allow the legacy generate endpoint to run without any secret in production", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "app", "api", "admin", "generate", "route.ts"),
      "utf8"
    );

    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).not.toContain("(!adminPassword && !cronSecret)");
  });
});
