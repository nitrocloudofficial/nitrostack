import * as fs from "fs/promises";
import * as path from "path";
import { CodeInsights, ThemeTokens } from "../schemas/analyzer.schemas.js";
import { safeReadFile } from "../utils/fs-guard.js";

export class CodeReaderService {
  async inspectCodebase(projectPath: string, themeTokens: ThemeTokens): Promise<CodeInsights> {
    const absolutePath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);

    // Helper for relative path
    const getRelativePath = (fileFullPath: string) => path.relative(absolutePath, fileFullPath);

    // 1. Discover files (skipping symlinks)
    const fileEntries = await this.discoverSourceFiles(absolutePath);

    if (fileEntries.length === 0) {
      return {
        totalComponentFiles: 0,
        stylingApproach: "unknown",
        hasDesignSystem: false,
        buttonVariantsDetected: 0,
        colorTokenConsistency: 1.0,
        accessibilityIssues: [],
        existingAnimationUsage: [],
        routeCount: 0,
        avgComponentSizeLines: 0,
      };
    }

    // 2. Route count
    const routeFiles = fileEntries.filter(
      (f) =>
        f.relativePath.includes("page.") ||
        f.relativePath.startsWith("pages/") ||
        f.relativePath.includes("route.")
    );
    const routeCount = Math.max(0, routeFiles.length);

    // 3. Component files
    const componentFiles = fileEntries.filter(
      (f) =>
        (f.extension === ".tsx" || f.extension === ".jsx") &&
        !f.relativePath.includes("page.") &&
        !f.relativePath.includes("layout.") &&
        !f.relativePath.includes("_app.") &&
        !f.relativePath.includes("_document.")
    );
    const totalComponentFiles = componentFiles.length;

    // 4. Design System Check
    const dsFiles = fileEntries.filter(
      (f) =>
        f.relativePath.includes("/ui/") ||
        f.relativePath.includes("components/ui") ||
        f.relativePath.includes("design-system")
    );
    const hasDesignSystem = dsFiles.length >= 3;

    // 5. Priority-based file selection for reading (max 60 files)
    const prioritizedFiles = [...fileEntries].sort((a, b) => {
      const score = (file: typeof a) => {
        const p = file.relativePath.toLowerCase();
        if (p.includes("page.") || p.includes("layout.")) return 10;
        if (p.includes("components/") || p.includes("ui/")) return 8;
        if (p.endsWith(".css") || p.endsWith(".scss")) return 6;
        return 1;
      };
      return score(b) - score(a);
    });

    const targetFilesToRead = prioritizedFiles.slice(0, 60);
    const fileContents: { path: string; content: string; lines: number }[] = [];

    for (const file of targetFilesToRead) {
      const content = await safeReadFile(file.fullPath, 512_000);
      if (content !== null) {
        const lines = content.split("\n").length;
        fileContents.push({ path: getRelativePath(file.fullPath), content, lines });
      }
    }

    // 6. Styling approach detection
    let tailwindCount = 0;
    let cssModulesCount = 0;
    let styledCount = 0;
    let plainCssCount = 0;

    for (const fc of fileContents) {
      if (fc.content.includes("className=") && /className=["'][^"']*\b(flex|grid|p-|m-|text-|bg-)/.test(fc.content)) {
        tailwindCount++;
      }
      if (fc.content.includes(".module.css") || fc.content.includes(".module.scss")) {
        cssModulesCount++;
      }
      if (fc.content.includes("styled.") || fc.content.includes("@emotion")) {
        styledCount++;
      }
      if (fc.content.includes("import") && fc.content.includes(".css'")) {
        plainCssCount++;
      }
    }

    let stylingApproach: CodeInsights["stylingApproach"] = "unknown";
    const approachScores = [
      { type: "tailwind" as const, count: tailwindCount },
      { type: "css-modules" as const, count: cssModulesCount },
      { type: "styled-components" as const, count: styledCount },
      { type: "plain-css" as const, count: plainCssCount },
    ].sort((a, b) => b.count - a.count);

    if (approachScores[0].count > 0) {
      if (approachScores[1] && approachScores[1].count > 1) {
        stylingApproach = "mixed";
      } else {
        stylingApproach = approachScores[0].type;
      }
    }

    // 7. Button variants & Accessibility issues
    const buttonVariants = new Set<string>();
    const accessibilityIssues: string[] = [];
    const animationUsages = new Set<string>();
    let hexMatchesCount = 0;
    let matchingThemeHexCount = 0;

    const themeColorsUpper = new Set(themeTokens.colors.map((c) => c.toUpperCase()));

    for (const fc of fileContents) {
      const fileName = path.basename(fc.path);

      // Button variants scanner
      const btnMatches = fc.content.matchAll(/<(?:button|Button)[^>]*className=["']([^"']+)["']/g);
      for (const match of btnMatches) {
        buttonVariants.add(match[1].trim());
      }
      const variantPropMatches = fc.content.matchAll(/variant=["']([^"']+)["']/g);
      for (const match of variantPropMatches) {
        buttonVariants.add(`variant:${match[1].trim()}`);
      }

      // Accessibility: Img missing alt
      const imgMatches = fc.content.matchAll(/<img\s+([^>]*)\/?>/gi);
      for (const match of imgMatches) {
        const attributes = match[1];
        if (!/alt=["'][^"']*["']/i.test(attributes)) {
          accessibilityIssues.push(`Missing 'alt' attribute on <img> in ${fileName}`);
        }
      }

      // Accessibility: Div with onClick but no role/tabIndex
      if (/<div[^>]*onClick=[^>]*>/i.test(fc.content) && !/role=["']/i.test(fc.content)) {
        accessibilityIssues.push(`Non-interactive <div> with onClick missing role/tabIndex in ${fileName}`);
      }

      // Accessibility: Button without text content or aria-label
      const emptyBtnMatches = fc.content.matchAll(/<(?:button|Button)[^>]*>\s*<\/(?:button|Button)>/gi);
      for (const _ of emptyBtnMatches) {
        accessibilityIssues.push(`Empty <button> missing label/aria-label in ${fileName}`);
      }

      // Animation Usage Scanner
      if (fc.content.includes("motion.") || fc.content.includes("AnimatePresence")) {
        animationUsages.add(`Framer Motion used in ${fileName}`);
      }
      if (fc.content.includes("gsap.")) {
        animationUsages.add(`GSAP timeline used in ${fileName}`);
      }
      if (fc.content.includes("@keyframes") || fc.content.includes("animation:")) {
        animationUsages.add(`CSS @keyframes animation in ${fileName}`);
      }
      if (/animate-(spin|bounce|pulse|fade|slide)/.test(fc.content)) {
        animationUsages.add(`Tailwind animation utilities in ${fileName}`);
      }

      // Color Token Consistency
      const hexes = fc.content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      for (const hex of hexes) {
        hexMatchesCount++;
        if (themeColorsUpper.has(hex.toUpperCase())) {
          matchingThemeHexCount++;
        }
      }
    }

    const buttonVariantsDetected = Math.max(buttonVariants.size, totalComponentFiles > 0 ? 1 : 0);

    const colorTokenConsistency =
      hexMatchesCount > 0
        ? Math.round((matchingThemeHexCount / hexMatchesCount) * 100) / 100
        : 1.0;

    // 8. Average component line size
    const componentFileContents = fileContents.filter(
      (fc) => fc.path.endsWith(".tsx") || fc.path.endsWith(".jsx")
    );
    const totalLines = componentFileContents.reduce((acc, fc) => acc + fc.lines, 0);
    const avgComponentSizeLines =
      componentFileContents.length > 0
        ? Math.round(totalLines / componentFileContents.length)
        : 0;

    return {
      totalComponentFiles,
      stylingApproach,
      hasDesignSystem,
      buttonVariantsDetected,
      colorTokenConsistency,
      accessibilityIssues: Array.from(new Set(accessibilityIssues)),
      existingAnimationUsage: Array.from(animationUsages),
      routeCount,
      avgComponentSizeLines,
    };
  }

  private async discoverSourceFiles(
    dir: string,
    maxDepth = 4,
    currentDepth = 0
  ): Promise<{ fullPath: string; relativePath: string; extension: string }[]> {
    if (currentDepth > maxDepth) return [];
    let results: { fullPath: string; relativePath: string; extension: string }[] = [];

    const allowedExtensions = [".tsx", ".jsx", ".ts", ".js", ".css", ".scss"];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.isSymbolicLink() || // Skip symlinks to prevent infinite loops
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === ".next" ||
          entry.name === "build"
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(dir, fullPath);
        const ext = path.extname(entry.name);

        if (entry.isFile() && allowedExtensions.includes(ext)) {
          results.push({ fullPath, relativePath: relPath, extension: ext });
        } else if (entry.isDirectory()) {
          const subResults = await this.discoverSourceFiles(fullPath, maxDepth, currentDepth + 1);
          results = results.concat(
            subResults.map((s) => ({
              ...s,
              relativePath: path.join(entry.name, s.relativePath),
            }))
          );
        }
      }
    } catch {
      // Ignore read errors for inaccessible folders
    }

    return results;
  }
}
