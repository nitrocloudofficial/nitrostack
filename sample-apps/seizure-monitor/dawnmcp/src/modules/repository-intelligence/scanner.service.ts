import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────

/** Classification of a file by purpose. */
export type FileType = 'source' | 'config' | 'documentation' | 'test' | 'asset' | 'data' | 'other';

/** Information about a single scanned file. */
export interface ScannedFile {
  /** Absolute path to the file. */
  absolutePath: string;
  /** Path relative to the repository root. */
  relativePath: string;
  /** File extension (e.g. ".ts"). */
  extension: string;
  /** Detected programming language or file type. */
  language: string;
  /** File purpose classification. */
  fileType: FileType;
  /** File size in bytes. */
  sizeBytes: number;
}

/** Summary statistics for a scanned repository. */
export interface ScanResult {
  /** Root path of the scanned repository. */
  repoPath: string;
  /** All scanned files. */
  files: ScannedFile[];
  /** Aggregate statistics. */
  stats: {
    totalFiles: number;
    totalSizeBytes: number;
    /** Language → file count. */
    languages: Record<string, number>;
    /** FileType → file count. */
    fileTypes: Record<string, number>;
    /** Top-level directories found. */
    topLevelDirs: string[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '__pycache__',
  '.venv', 'venv', '.tox', 'coverage', '.nyc_output', '.cache', '.turbo',
  '.output', '.vercel', '.netlify', '.svelte-kit', 'target', 'vendor',
  '.idea', '.vscode', '.DS_Store', '.nitrostudio',
]);

const IGNORE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.lock', '.map', '.min.js', '.min.css',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt',
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.py': 'Python', '.pyw': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.hpp': 'C++',
  '.c': 'C', '.h': 'C/C++ Header',
  '.swift': 'Swift',
  '.kt': 'Kotlin', '.kts': 'Kotlin',
  '.scala': 'Scala',
  '.r': 'R', '.R': 'R',
  '.dart': 'Dart',
  '.lua': 'Lua',
  '.sql': 'SQL',
  '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
  '.ps1': 'PowerShell',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.json': 'JSON', '.jsonc': 'JSON',
  '.toml': 'TOML',
  '.xml': 'XML',
  '.html': 'HTML', '.htm': 'HTML',
  '.css': 'CSS', '.scss': 'SCSS', '.less': 'Less', '.sass': 'Sass',
  '.md': 'Markdown', '.mdx': 'Markdown',
  '.txt': 'Text',
  '.env': 'Environment',
  '.dockerfile': 'Dockerfile',
  '.graphql': 'GraphQL', '.gql': 'GraphQL',
  '.proto': 'Protobuf',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

const TEST_PATTERNS = [
  /\.test\./i, /\.spec\./i, /_test\./i, /_spec\./i,
  /^test[/\\]/i, /^tests[/\\]/i, /__tests__[/\\]/i,
];

const CONFIG_PATTERNS = [
  /^\.env/, /config\./i, /\.config\./i, /\.rc$/i,
  /tsconfig/i, /package\.json$/i, /webpack/i, /vite\.config/i,
  /next\.config/i, /jest\.config/i, /eslint/i, /prettier/i,
  /dockerfile/i, /docker-compose/i, /makefile/i,
  /\.gitignore$/i, /\.dockerignore$/i,
];

// ─── Service ──────────────────────────────────────────────────────────

/**
 * Repository Scanner Service
 *
 * Recursively walks a local repository, enforcing path normalization and safety checks.
 */
@Injectable()
export class ScannerService {
  /**
   * Validate and resolve path safety.
   */
  validatePath(targetPath: string): string {
    const resolved = path.resolve(targetPath);

    // Reject path traversal attempts (e.g. root dir system access)
    if (resolved === path.parse(resolved).root) {
      throw new Error(`Access denied: System root access is restricted (${resolved})`);
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`Path does not exist: ${resolved}`);
    }

    return resolved;
  }

  /**
   * Scan a local repository directory.
   */
  async scanRepository(repoPath: string): Promise<ScanResult> {
    const resolvedPath = this.validatePath(repoPath);

    if (!fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`);
    }

    const files: ScannedFile[] = [];
    this.walkDirectory(resolvedPath, resolvedPath, files);

    const languages: Record<string, number> = {};
    const fileTypes: Record<string, number> = {};
    let totalSizeBytes = 0;

    for (const file of files) {
      languages[file.language] = (languages[file.language] || 0) + 1;
      fileTypes[file.fileType] = (fileTypes[file.fileType] || 0) + 1;
      totalSizeBytes += file.sizeBytes;
    }

    const topLevelDirs = fs
      .readdirSync(resolvedPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !IGNORE_DIRS.has(d.name))
      .map((d) => d.name);

    return {
      repoPath: resolvedPath,
      files,
      stats: {
        totalFiles: files.length,
        totalSizeBytes,
        languages,
        fileTypes,
        topLevelDirs,
      },
    };
  }

  /**
   * Identify important project files.
   */
  identifyImportantFiles(scanResult: ScanResult): ScannedFile[] {
    const importantPatterns = [
      /readme/i, /contributing/i, /changelog/i,
      /^src[/\\]index\./i, /^src[/\\]main\./i, /^src[/\\]app\./i,
      /package\.json$/i, /tsconfig/i,
      /docker-compose/i, /dockerfile/i,
      /\.env\.example$/i,
      /schema/i, /migration/i,
    ];

    return scanResult.files.filter((f) =>
      importantPatterns.some((p) => p.test(f.relativePath)),
    );
  }

  // ── Private ────────────────────────────────────────────────────────

  private walkDirectory(rootPath: string, currentPath: string, results: ScannedFile[]): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          this.walkDirectory(rootPath, fullPath, results);
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORE_EXTENSIONS.has(ext)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.size > 1_048_576) continue;

      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

      results.push({
        absolutePath: fullPath,
        relativePath,
        extension: ext,
        language: this.detectLanguage(entry.name, ext),
        fileType: this.classifyFile(relativePath, ext),
        sizeBytes: stat.size,
      });
    }
  }

  private detectLanguage(filename: string, ext: string): string {
    const lowerName = filename.toLowerCase();
    if (lowerName === 'dockerfile') return 'Dockerfile';
    if (lowerName === 'makefile') return 'Makefile';
    if (lowerName.startsWith('.env')) return 'Environment';

    return LANGUAGE_MAP[ext] ?? 'Unknown';
  }

  private classifyFile(relativePath: string, ext: string): FileType {
    if (TEST_PATTERNS.some((p) => p.test(relativePath))) return 'test';
    if (CONFIG_PATTERNS.some((p) => p.test(relativePath))) return 'config';
    if (['.md', '.mdx', '.txt', '.rst'].includes(ext)) return 'documentation';
    if (['.json', '.yaml', '.yml', '.toml', '.xml', '.csv'].includes(ext)) return 'data';

    if (LANGUAGE_MAP[ext] && !['JSON', 'YAML', 'XML', 'Text', 'Markdown', 'Environment'].includes(LANGUAGE_MAP[ext])) {
      return 'source';
    }

    return 'other';
  }
}
