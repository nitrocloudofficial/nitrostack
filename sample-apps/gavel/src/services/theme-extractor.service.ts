import * as path from "path";
import { ThemeTokens } from "../schemas/analyzer.schemas.js";
import { FileReaderService } from "./file-reader.service.js";
import { safeReadFile } from "../utils/fs-guard.js";

export class ThemeExtractorService {
  private fileReader = new FileReaderService();

  async extractTheme(projectPath: string): Promise<ThemeTokens> {
    const extractedColors: Set<string> = new Set();
    const extractedFonts: Set<string> = new Set();
    const extractedSpacing: Set<number> = new Set();

    // 1. Check Tailwind Config Files (including monorepo paths)
    const tailwindFiles = [
      "tailwind.config.js",
      "tailwind.config.ts",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
      "apps/web/tailwind.config.js",
      "apps/web/tailwind.config.ts",
      "apps/frontend/tailwind.config.js",
      "packages/ui/tailwind.config.js",
    ];

    for (const fileName of tailwindFiles) {
      const fullPath = path.join(projectPath, fileName);
      const content = await safeReadFile(fullPath, 512_000);
      if (content) {
        // Regex extract hex colors
        const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (hexMatches) {
          hexMatches.forEach((color) => extractedColors.add(color.toUpperCase()));
        }

        // Regex extract font family names
        const fontMatches = content.match(/(fontFamily|fonts)\s*:\s*\{([^}]+)\}/s);
        if (fontMatches) {
          const fontStrings = fontMatches[2].match(/['"]([^'"]+)['"]/g);
          if (fontStrings) {
            fontStrings.forEach((f) => extractedFonts.add(f.replace(/['"]/g, "")));
          }
        }

        // Regex extract spacing scale values if custom spacing defined
        const spacingMatch = content.match(/spacing\s*:\s*\{([^}]+)\}/s);
        if (spacingMatch) {
          const pxMatches = spacingMatch[1].matchAll(/:\s*['"](\d+)(?:px|rem)?['"]/g);
          for (const m of pxMatches) {
            const val = parseInt(m[1], 10);
            if (!isNaN(val)) extractedSpacing.add(val);
          }
        }
      }
    }

    // 2. Check CSS Files for Custom Properties (--color-*, hex values, font-family)
    const cssCandidatePaths = [
      "app/globals.css",
      "src/app/globals.css",
      "styles/globals.css",
      "src/styles/globals.css",
      "index.css",
      "src/index.css",
      "styles/index.css",
      "src/styles/main.css",
      "app/layout.css",
      "public/styles.css",
      "apps/web/app/globals.css",
      "apps/frontend/src/index.css",
    ];

    for (const relativeCssPath of cssCandidatePaths) {
      const fullPath = path.join(projectPath, relativeCssPath);
      const content = await safeReadFile(fullPath, 512_000);
      if (content) {
        // Extract CSS Hex Colors
        const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (hexMatches) {
          hexMatches.forEach((color) => extractedColors.add(color.toUpperCase()));
        }

        // Extract font-family declarations
        const fontMatches = content.match(/font-family\s*:\s*([^;]+);/gi);
        if (fontMatches) {
          fontMatches.forEach((declaration) => {
            const fontVal = declaration.split(":")[1].replace(";", "").trim();
            fontVal.split(",").forEach((f) => extractedFonts.add(f.replace(/['"]/g, "").trim()));
          });
        }
      }
    }

    // Fallback Defaults if empty
    const colors =
      extractedColors.size > 0
        ? Array.from(extractedColors)
        : ["#3B82F6", "#1E40AF", "#93C5FD", "#111827", "#F3F4F6"];

    const fonts =
      extractedFonts.size > 0
        ? Array.from(extractedFonts)
        : ["Inter", "system-ui", "sans-serif"];

    const spacingScale =
      extractedSpacing.size > 0
        ? Array.from(extractedSpacing).sort((a, b) => a - b)
        : [4, 8, 12, 16, 24, 32, 48, 64];

    return {
      colors,
      fonts,
      spacingScale,
    };
  }
}
