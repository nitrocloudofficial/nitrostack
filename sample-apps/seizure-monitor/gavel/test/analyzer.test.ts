import { describe, it, expect, afterAll } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import { ProjectAnalyzerService } from "../src/services/project-analyzer.service.js";
import { IntentService } from "../src/services/intent.service.js";
import { DesignSpecService } from "../src/services/design-spec.service.js";
import { ProjectProfileSchema } from "../src/schemas/analyzer.schemas.js";
import { DesignSpecSchema } from "../src/schemas/recommendation.schemas.js";
import { GavelError } from "../src/utils/fs-guard.js";

describe("ProjectAnalyzerService - Task 1 & 2 Verification", () => {
  const analyzer = new ProjectAnalyzerService();
  const sampleAppPath = path.join(process.cwd(), "test", "fixtures", "sample-next-app");

  it("should inspect sample-next-app and detect Next.js framework", async () => {
    const profile = await analyzer.analyze(sampleAppPath);

    expect(profile.framework).toBe("next");
    expect(profile.hasAnimationLibrary).toBe(true);
    expect(profile.installedLibraries).toContain("next");
    expect(profile.installedLibraries).toContain("framer-motion");
  });

  it("should extract deep codeInsights from component files", async () => {
    const profile = await analyzer.analyze(sampleAppPath);

    expect(profile.codeInsights).toBeDefined();
    if (profile.codeInsights) {
      expect(profile.codeInsights.totalComponentFiles).toBeGreaterThanOrEqual(4);
      expect(profile.codeInsights.hasDesignSystem).toBe(true);
      expect(profile.codeInsights.stylingApproach).toBe("tailwind");
      expect(profile.codeInsights.buttonVariantsDetected).toBeGreaterThanOrEqual(1);
    }
  });

  it("should detect accessibility issues (missing alt, non-interactive div onClick)", async () => {
    const profile = await analyzer.analyze(sampleAppPath);

    expect(profile.codeInsights).toBeDefined();
    if (profile.codeInsights) {
      const issuesString = profile.codeInsights.accessibilityIssues.join(" ");
      expect(issuesString).toContain("Missing 'alt' attribute");
      expect(issuesString).toContain("onClick");
    }
  });

  it("should scan existing animation usage in component source files", async () => {
    const profile = await analyzer.analyze(sampleAppPath);

    expect(profile.codeInsights).toBeDefined();
    if (profile.codeInsights) {
      const animationString = profile.codeInsights.existingAnimationUsage.join(" ");
      expect(animationString).toContain("Framer Motion used in Hero.tsx");
    }
  });

  it("should validate complete output strictly against ProjectProfileSchema with codeInsights", async () => {
    const profile = await analyzer.analyze(sampleAppPath);
    const parseResult = ProjectProfileSchema.safeParse(profile);

    expect(parseResult.success).toBe(true);
  });
});

describe("ProjectAnalyzerService - Task 3 Edge Case Hardening Verification", () => {
  const analyzer = new ProjectAnalyzerService();

  it("should throw GavelError when path does not exist", async () => {
    const nonExistentPath = path.join(process.cwd(), "test", "fixtures", "does-not-exist");
    await expect(analyzer.analyze(nonExistentPath)).rejects.toThrow(GavelError);
  });

  it("should throw GavelError when path points to a file instead of a directory", async () => {
    const filePath = path.join(process.cwd(), "package.json");
    await expect(analyzer.analyze(filePath)).rejects.toThrow(GavelError);
  });

  it("should handle bare-project without package.json gracefully with defaults", async () => {
    const barePath = path.join(process.cwd(), "test", "fixtures", "bare-project");
    const profile = await analyzer.analyze(barePath);

    expect(profile.framework).toBe("unknown");
    expect(profile.installedLibraries).toHaveLength(0);
    expect(profile.codeInsights?.totalComponentFiles).toBe(0);
    expect(profile.codeInsights?.stylingApproach).toBe("unknown");
  });

  it("should inspect monorepo project and detect Next.js framework from sub-package", async () => {
    const monorepoPath = path.join(process.cwd(), "test", "fixtures", "monorepo-project");
    const profile = await analyzer.analyze(monorepoPath);

    expect(profile.framework).toBe("next");
    expect(profile.installedLibraries).toContain("next");
  });

  it("should extract theme tokens and styling approach from plain-css project", async () => {
    const plainCssPath = path.join(process.cwd(), "test", "fixtures", "plain-css-project");
    const profile = await analyzer.analyze(plainCssPath);

    expect(profile.framework).toBe("react");
    expect(profile.codeInsights?.stylingApproach).toBe("plain-css");
    expect(profile.themeTokens.colors).toContain("#FF5733");
    expect(profile.themeTokens.colors).toContain("#121212");
    expect(profile.themeTokens.fonts).toContain("Roboto");
  });
});

describe("IntentService - Task 4 Intent Elicitation & Caching Verification", () => {
  const intentService = new IntentService();
  const analyzer = new ProjectAnalyzerService();
  const sampleAppPath = path.join(process.cwd(), "test", "fixtures", "sample-next-app");
  const cacheFilePath = path.join(sampleAppPath, ".gavel-context");

  afterAll(async () => {
    try {
      await fs.unlink(cacheFilePath);
    } catch {
      // Ignore if doesn't exist
    }
  });

  it("should save user intent to .gavel-context file", async () => {
    const saved = await intentService.saveCache(sampleAppPath, {
      audience: "technical",
      priority: "polish",
      visualGoal: "smooth-scroll",
    });

    expect(saved.audience).toBe("technical");
    expect(saved.priority).toBe("polish");
    expect(saved.visualGoal).toBe("smooth-scroll");
    expect(saved.updatedAt).toBeDefined();
  });

  it("should read cached intent and report status as fresh", async () => {
    const status = await intentService.getCacheStatus(sampleAppPath);

    expect(status.exists).toBe(true);
    expect(status.isFresh).toBe(true);
    expect(status.answers?.audience).toBe("technical");
  });

  it("should attach intent to ProjectProfile when analyzing project with cached intent", async () => {
    const profile = await analyzer.analyze(sampleAppPath);

    expect(profile.intent).toBeDefined();
    expect(profile.intent?.audience).toBe("technical");
    expect(profile.intent?.priority).toBe("polish");
    expect(profile.intent?.visualGoal).toBe("smooth-scroll");

    const parseResult = ProjectProfileSchema.safeParse(profile);
    expect(parseResult.success).toBe(true);
  });
});

describe("DesignSpecService - Task 5 Design Spec Generation Verification", () => {
  const designSpecService = new DesignSpecService();
  const sampleAppPath = path.join(process.cwd(), "test", "fixtures", "sample-next-app");

  it("should generate a DesignSpec for Framer Motion with extracted theme colors", async () => {
    const spec = await designSpecService.generate(sampleAppPath, "Framer Motion");

    expect(spec.library).toBe("Framer Motion");
    expect(spec.colors.primary).toBe("#6366F1");
    expect(spec.colors.secondary).toBe("#10B981");
    expect(spec.motion.durationMs).toBe(300);
    expect(spec.targetFiles.length).toBeGreaterThan(0);
    expect(spec.codeSnippet).toContain("motion.div");
  });

  it("should generate a DesignSpec for Lenis when selected", async () => {
    const spec = await designSpecService.generate(sampleAppPath, "Lenis");

    expect(spec.library).toBe("Lenis");
    expect(spec.motion.durationMs).toBe(1200);
    expect(spec.codeSnippet).toContain("new Lenis");
  });

  it("should validate complete output strictly against DesignSpecSchema", async () => {
    const spec = await designSpecService.generate(sampleAppPath);
    const parseResult = DesignSpecSchema.safeParse(spec);

    expect(parseResult.success).toBe(true);
  });
});
