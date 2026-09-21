import { describe, it, expect } from "vitest";
import * as path from "path";
import { ProjectAnalyzerService } from "../../src/services/project-analyzer.service.js";
import { DesignSpecService } from "../../src/services/design-spec.service.js";
import { ProjectProfileSchema } from "../../src/schemas/analyzer.schemas.js";
import { DesignSpecSchema } from "../../src/schemas/recommendation.schemas.js";

import * as fs from "fs";

describe("Multi-Repo Real-World Validation Integration Suite", () => {
  const analyzer = new ProjectAnalyzerService();
  const designSpecService = new DesignSpecService();
  const realReposDir = path.join(process.cwd(), "test", "fixtures", "real-repos");

  describe("Real Repo 1: Next.js Portfolio (dillionverma/portfolio)", () => {
    const portfolioPath = path.join(realReposDir, "portfolio");

    it("should analyze real Next.js portfolio and produce a valid ProjectProfile", async () => {
      if (!fs.existsSync(portfolioPath)) {
        return; // Skip if optional real-repo fixture is not cloned locally
      }
      const profile = await analyzer.analyze(portfolioPath);

      expect(profile.framework).toBe("next");
      expect(profile.installedLibraries.length).toBeGreaterThan(0);
      expect(profile.codeInsights).toBeDefined();
      expect(profile.codeInsights?.totalComponentFiles).toBeGreaterThan(0);
      expect(profile.themeTokens.colors.length).toBeGreaterThan(0);

      const parseResult = ProjectProfileSchema.safeParse(profile);
      expect(parseResult.success).toBe(true);
    });

    it("should generate a valid DesignSpec for real Next.js portfolio", async () => {
      if (!fs.existsSync(portfolioPath)) return;
      const spec = await designSpecService.generate(portfolioPath, "Magic UI");

      expect(spec.library).toBe("Magic UI");
      expect(spec.colors.primary).toBeDefined();
      expect(spec.motion.durationMs).toBe(400);
      expect(spec.codeSnippet).toContain("ShineBorder");

      const parseResult = DesignSpecSchema.safeParse(spec);
      expect(parseResult.success).toBe(true);
    });
  });

  describe("Real Repo 2: React Dashboard (devias-io/material-kit-react)", () => {
    const dashboardPath = path.join(realReposDir, "material-kit-react");

    it("should analyze real React dashboard and produce a valid ProjectProfile", async () => {
      if (!fs.existsSync(dashboardPath)) return;
      const profile = await analyzer.analyze(dashboardPath);

      expect(["react", "next"]).toContain(profile.framework);
      expect(profile.installedLibraries.length).toBeGreaterThan(0);
      expect(profile.codeInsights).toBeDefined();
      expect(profile.codeInsights?.totalComponentFiles).toBeGreaterThan(0);

      const parseResult = ProjectProfileSchema.safeParse(profile);
      expect(parseResult.success).toBe(true);
    });

    it("should generate a valid DesignSpec for real React dashboard", async () => {
      if (!fs.existsSync(dashboardPath)) return;
      const spec = await designSpecService.generate(dashboardPath, "Framer Motion");

      expect(spec.library).toBe("Framer Motion");
      expect(spec.colors.primary).toBeDefined();
      expect(spec.motion.durationMs).toBe(300);

      const parseResult = DesignSpecSchema.safeParse(spec);
      expect(parseResult.success).toBe(true);
    });
  });
});
