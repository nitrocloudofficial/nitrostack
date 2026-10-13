import * as fs from "fs/promises";
import * as path from "path";
import { ProjectProfile } from "../schemas/analyzer.schemas.js";
import { FileReaderService } from "./file-reader.service.js";
import { ThemeExtractorService } from "./theme-extractor.service.js";
import { CodeReaderService } from "./code-reader.service.js";
import { IntentService } from "./intent.service.js";
import { assertIsDirectory } from "../utils/fs-guard.js";

export class ProjectAnalyzerService {
  private fileReader = new FileReaderService();
  private themeExtractor = new ThemeExtractorService();
  private codeReader = new CodeReaderService();
  private intentService = new IntentService();

  async analyze(projectPath: string): Promise<ProjectProfile> {
    const absolutePath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);

    // 1. Edge Case Guard: Ensure valid directory
    await assertIsDirectory(absolutePath);

    // 2. Package.json inspection with Monorepo support
    let rootPackageJsonPath = path.join(absolutePath, "package.json");
    let packageJsonPathsToInspect: string[] = [];

    if (await this.fileReader.fileExists(rootPackageJsonPath)) {
      packageJsonPathsToInspect.push(rootPackageJsonPath);
    }

    // Monorepo sub-dir candidates
    const monorepoSubDirs = ["apps/web", "apps/frontend", "apps/app", "packages/app"];
    for (const subDir of monorepoSubDirs) {
      const candidate = path.join(absolutePath, subDir, "package.json");
      if (await this.fileReader.fileExists(candidate)) {
        packageJsonPathsToInspect.push(candidate);
      }
    }

    let framework: "react" | "next" | "unknown" = "unknown";
    let installedLibraries: string[] = [];
    let hasAnimationLibrary = false;
    let bundleSizeKb = 50; // Default baseline

    for (const pkgPath of packageJsonPathsToInspect) {
      const pkg = await this.fileReader.readJson<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(pkgPath);

      if (pkg) {
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const libs = Object.keys(deps);
        installedLibraries = Array.from(new Set([...installedLibraries, ...libs]));

        // Framework Detection (prioritize Next over React if found)
        if ("next" in deps) {
          framework = "next";
          bundleSizeKb += 45;
        } else if ("react" in deps && framework === "unknown") {
          framework = "react";
          bundleSizeKb += 25;
        }

        // Animation Library Inspection
        const animationPackages = [
          "framer-motion",
          "gsap",
          "lenis",
          "@studio-freight/lenis",
          "three",
          "@react-three/fiber",
          "@react-three/drei",
          "magic-ui",
          "react-bits",
        ];

        if (!hasAnimationLibrary) {
          hasAnimationLibrary = libs.some((lib) =>
            animationPackages.includes(lib.toLowerCase())
          );
        }

        // Add approximate bundle weight for installed packages
        if ("three" in deps || "@react-three/fiber" in deps) bundleSizeKb += 140;
        if ("framer-motion" in deps) bundleSizeKb += 32;
        if ("gsap" in deps) bundleSizeKb += 24;
      }
    }

    // Heuristic Project Type Classification
    const projectType = await this.detectProjectType(absolutePath);

    // Extract Theme Tokens
    const themeTokens = await this.themeExtractor.extractTheme(absolutePath);

    // Deep Code-Reading Insights (Task 2)
    const codeInsights = await this.codeReader.inspectCodebase(absolutePath, themeTokens);

    // Cached Intent Elicitation (Task 4)
    const intent = await this.intentService.readCache(absolutePath);

    return {
      framework,
      bundleSizeKb,
      lighthouseScore: 88, // Baseline estimation
      projectType,
      hasAnimationLibrary,
      installedLibraries,
      themeTokens,
      codeInsights,
      intent: intent ?? undefined,
    };
  }

  private async detectProjectType(
    projectPath: string
  ): Promise<"portfolio" | "dashboard" | "ecommerce" | "landing" | "unknown"> {
    try {
      const files = await this.getFilesRecursively(projectPath, 3);
      const filePathsStr = files.join(" ").toLowerCase();

      if (
        filePathsStr.includes("dashboard") ||
        filePathsStr.includes("analytics") ||
        filePathsStr.includes("admin") ||
        filePathsStr.includes("table")
      ) {
        return "dashboard";
      }

      if (
        filePathsStr.includes("cart") ||
        filePathsStr.includes("checkout") ||
        filePathsStr.includes("product") ||
        filePathsStr.includes("store")
      ) {
        return "ecommerce";
      }

      if (
        filePathsStr.includes("portfolio") ||
        filePathsStr.includes("resume") ||
        filePathsStr.includes("projects") ||
        filePathsStr.includes("about")
      ) {
        return "portfolio";
      }

      if (
        filePathsStr.includes("hero") ||
        filePathsStr.includes("landing") ||
        filePathsStr.includes("cta") ||
        filePathsStr.includes("features")
      ) {
        return "landing";
      }
    } catch {
      // Fallback if directory reading fails
    }

    return "unknown";
  }

  private async getFilesRecursively(dir: string, maxDepth: number, currentDepth = 0): Promise<string[]> {
    if (currentDepth > maxDepth) return [];
    let results: string[] = [];

    try {
      const list = await fs.readdir(dir, { withFileTypes: true });
      for (const file of list) {
        if (file.name === "node_modules" || file.name === ".git" || file.name === "dist") {
          continue;
        }
        const fullPath = path.join(dir, file.name);
        results.push(file.name);
        if (file.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, maxDepth, currentDepth + 1);
          results = results.concat(subFiles);
        }
      }
    } catch {
      // Ignore read errors for restricted folders
    }

    return results;
  }
}
