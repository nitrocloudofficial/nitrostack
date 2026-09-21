import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Build Verification (Role D)", () => {
  it("dist directory structure and main entry point exist after build", () => {
    const distPath = path.resolve(process.cwd(), "dist");
    const indexJsPath = path.resolve(distPath, "index.js");
    const mainJsPath = path.resolve(distPath, "main.js");

    // Verify build artifact output exists
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(indexJsPath)).toBe(true);
    expect(fs.existsSync(mainJsPath)).toBe(true);

    const indexJsContent = fs.readFileSync(indexJsPath, "utf-8");
    expect(indexJsContent.length).toBeGreaterThan(0);
  });
});
