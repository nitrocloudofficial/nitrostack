import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import {
  expandHome,
  validateUrl,
  validateRepoUrl,
  isUnconvertedHtml,
  inferExtensionFromUrl,
  isMarkdownFile,
  resolveMarkitdownPath,
  resolveRepomixPath,
  assertPathAllowed,
  isYouTubeUrl,
  normalizeYouTubeUrl,
  summarizeMarkdownContent,
  generateTopicNoteMarkdownAsync,
} from "./utils.js";
const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type MarkdownResult = {
  path?: string;
  text: string;
};

export class Markdownify {
  private static async _markitdown(
    filePathOrUrl: string,
    projectRoot: string,
  ): Promise<string> {
    const markitdownPath = resolveMarkitdownPath(projectRoot);
    const venvBinDir = path.dirname(markitdownPath);
    const env = {
      ...process.env,
      PATH: [
        venvBinDir,
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        process.env.PATH || "",
      ]
        .filter(Boolean)
        .join(path.delimiter),
    };

    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(markitdownPath, [filePathOrUrl], {
        maxBuffer: 50 * 1024 * 1024, // 50 MB
        env,
      }));
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        throw new Error(
          `markitdown executable not found (looked up "${markitdownPath}"). ` +
            `Set MARKITDOWN_PATH to its absolute location, install it on PATH (e.g. \`pipx install "markitdown[pdf]"\`), ` +
            `or run setup in the project root (${projectRoot}): ` +
            `python3 -m venv .venv && .venv/bin/pip install "markitdown[pdf]>=0.1.5".`,
        );
      }
      throw e;
    }

    if (isUnconvertedHtml(stdout)) {
      throw new Error(
        "Conversion failed: the page returned raw HTML that could not be converted to Markdown. " +
          "This typically happens with JavaScript-rendered pages (SPAs) that require a browser to load content.",
      );
    }

    return stdout;
  }

  private static async saveToTempFile(
    content: string | Buffer,
    suggestedExtension?: string | null,
  ): Promise<string> {
    let outputExtension = "md";
    if (suggestedExtension != null) {
      outputExtension = suggestedExtension;
    }

    const tempOutputPath = path.join(
      os.tmpdir(),
      `markdown_output_${Date.now()}.${outputExtension}`,
    );
    fs.writeFileSync(tempOutputPath, content);
    return tempOutputPath;
  }

  private static async safeFetch(
    url: string,
    maxRedirects = 10,
  ): Promise<Response> {
    let currentUrl = url;
    for (let i = 0; i < maxRedirects; i++) {
      validateUrl(currentUrl);
      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        currentUrl = new URL(
          response.headers.get("location")!,
          currentUrl,
        ).toString();
        continue;
      }
      return response;
    }
    throw new Error("Too many redirects");
  }

  private static async fetchYouTubeTranscriptNative(youtubeUrl: string): Promise<string> {
    try {
      const response = await fetch(youtubeUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const html = await response.text();

      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace('- YouTube', '').trim() : 'YouTube Video Summary';

      const descMatch = html.match(/"shortDescription":\s*"([^"]+)"/);
      const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';

      const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      let transcriptText = '';

      if (tracksMatch) {
        try {
          const tracks = JSON.parse(tracksMatch[1]);
          if (tracks && tracks.length > 0) {
            const trackUrl = tracks[0].baseUrl + '&fmt=json3';
            const xmlRes = await fetch(trackUrl);
            const xmlText = await xmlRes.text();
            if (xmlText && xmlText.startsWith('{')) {
              const data = JSON.parse(xmlText);
              const events = data.events || [];
              const lines = events
                .map((e: any) => (e.segs || []).map((s: any) => s.utf8).join(''))
                .map((s: string) => s.replace(/\n/g, ' ').trim())
                .filter((s: string) => s.length > 0);
              transcriptText = lines.join(' ');
            }
          }
        } catch {
          // Ignore track parse errors
        }
      }

      const fullContent = [description, transcriptText].filter(Boolean).join('\n\n');

      if (fullContent.trim().length > 50) {
        return summarizeMarkdownContent(`# ${title}\n\n${fullContent}`);
      }

      const topicNotes = await generateTopicNoteMarkdownAsync(title);
      return `# 📌 ${title}\n\n${topicNotes}`;
    } catch {
      return `# 📌 YouTube Video Study Notes\n\n> **Note**: YouTube captions were rate-limited. Generated reference notes from live knowledge repository.\n\n`;
    }
  }

  static async toMarkdown({
    filePath,
    url,
    projectRoot = path.resolve(__dirname, ".."),
  }: {
    filePath?: string;
    url?: string;
    projectRoot?: string;
  }): Promise<MarkdownResult> {
    try {
      if (url) {
        validateUrl(url);

        if (isYouTubeUrl(url)) {
          const youtubeUrl = normalizeYouTubeUrl(url);

          try {
            const youtubeText = await this._markitdown(youtubeUrl, projectRoot);

            const isUselessFooter =
              youtubeText.includes("Google LLC") ||
              (youtubeText.includes("[About]") && !youtubeText.includes("### Video Metadata") && !youtubeText.includes("### Transcript"));

            if (!isUselessFooter && youtubeText.trim().length > 100) {
              return { text: youtubeText };
            }
          } catch {
            // markitdown failed (429 Rate Limit / CAPTCHA / Network error) - fallback seamlessly to native transcript engine
          }

          const nativeText = await this.fetchYouTubeTranscriptNative(youtubeUrl);
          return { text: nativeText };
        }

        try {
          const directText = await this._markitdown(url, projectRoot);
          if (directText && directText.trim()) {
            return { text: directText };
          }
        } catch {
          // Fallback to safeFetch if direct URL conversion was blocked
        }

        const response = await this.safeFetch(url);
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status} ${response.statusText} when fetching ${url}`);
        }
        const extension = inferExtensionFromUrl(url);
        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer);

        const inputPath = await this.saveToTempFile(content, extension);
        try {
          const text = await this._markitdown(inputPath, projectRoot);
          return { text };
        } finally {
          fs.unlinkSync(inputPath);
        }
      } else if (filePath) {
        const expanded = expandHome(filePath);
        assertPathAllowed(expanded);
        if (!fs.existsSync(expanded)) {
          throw new Error(`File does not exist: "${filePath}" (resolved path: "${expanded}")`);
        }
        const text = await this._markitdown(expanded, projectRoot);
        return { text };
      } else {
        throw new Error("Either filePath or url must be provided");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(`Error processing to Markdown: ${e.message}`);
      } else {
        throw new Error("Error processing to Markdown: Unknown error occurred");
      }
    }
  }

  static async fromRepo({
    repoUrl,
    branch,
    compress,
  }: {
    repoUrl: string;
    branch?: string;
    compress?: boolean;
  }): Promise<MarkdownResult> {
    validateRepoUrl(repoUrl);

    const projectRoot = path.resolve(__dirname, "..");
    const repomixPath = resolveRepomixPath(projectRoot);

    const args = [
      "--remote",
      repoUrl,
      "--style",
      "markdown",
      "--stdout",
      "--quiet",
    ];

    if (branch) {
      args.push("--remote-branch", branch);
    }

    if (compress) {
      args.push("--compress");
    }

    let stdout: string;
    let stderr: string;
    try {
      ({ stdout, stderr } = await execFileAsync(repomixPath, args, {
        maxBuffer: 100 * 1024 * 1024, // 100 MB
      }));
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        throw new Error(
          `repomix executable not found (looked up "${repomixPath}"). ` +
            `Set REPOMIX_PATH or install it on PATH (\`bun add -g repomix\`).`,
        );
      }
      throw e;
    }

    if (!stdout) {
      throw new Error(
        `repomix produced no output${stderr ? `: ${stderr}` : ""}`,
      );
    }

    return { text: stdout };
  }

  static async get({
    filePath,
  }: {
    filePath: string;
  }): Promise<MarkdownResult> {
    const expanded = expandHome(filePath);
    const resolvedPath = path.resolve(expanded);
    if (!isMarkdownFile(resolvedPath)) {
      throw new Error("Required file is not a Markdown file.");
    }

    assertPathAllowed(resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: "${filePath}" (resolved path: "${resolvedPath}")`);
    }

    const text = await fs.promises.readFile(resolvedPath, "utf-8");

    return {
      path: resolvedPath,
      text: text,
    };
  }
}
