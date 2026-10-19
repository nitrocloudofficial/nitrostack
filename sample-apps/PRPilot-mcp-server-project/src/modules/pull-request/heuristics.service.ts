/**
 * PRPilot — Change Map & Heuristics Service
 * File classification, diff bounding, and transparent investigation signals.
 */

import { ChangedFile, ChangeMap, FileCategory, ReviewSignal } from './pull-request.types.js';

const MAX_PATCH_CHARS = 2000;
const MAX_FILES_PROCESSED = 100;

export class HeuristicsService {
  /**
   * Classify file path into standard categories
   */
  classifyFile(filename: string): FileCategory {
    const lower = filename.toLowerCase();

    // 1. Tests
    if (
      lower.includes('__tests__') ||
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.startsWith('test/') ||
      lower.startsWith('tests/') ||
      lower.startsWith('spec/') ||
      lower.startsWith('e2e/') ||
      lower.endsWith('_test.go') ||
      lower.endsWith('_test.py')
    ) {
      return 'tests';
    }

    // 2. Documentation
    if (
      lower.endsWith('.md') ||
      lower.endsWith('.markdown') ||
      lower.endsWith('.rst') ||
      lower.endsWith('.txt') ||
      lower.startsWith('docs/') ||
      lower.includes('readme') ||
      lower.includes('changelog') ||
      lower.includes('contributing') ||
      lower.includes('license')
    ) {
      return 'documentation';
    }

    // 3. Configuration & Dependencies
    if (
      lower.endsWith('package.json') ||
      lower.endsWith('package-lock.json') ||
      lower.endsWith('pnpm-lock.yaml') ||
      lower.endsWith('yarn.lock') ||
      lower.endsWith('cargo.toml') ||
      lower.endsWith('cargo.lock') ||
      lower.endsWith('requirements.txt') ||
      lower.endsWith('pyproject.toml') ||
      lower.endsWith('setup.py') ||
      lower.endsWith('go.mod') ||
      lower.endsWith('go.sum') ||
      lower.endsWith('gemfile') ||
      lower.endsWith('pom.xml') ||
      lower.endsWith('build.gradle') ||
      lower.startsWith('.github/') ||
      lower.includes('dockerfile') ||
      lower.includes('docker-compose') ||
      lower.includes('tsconfig') ||
      lower.startsWith('.env') ||
      lower.includes('.eslintrc') ||
      lower.includes('.prettierrc')
    ) {
      return 'config_dependencies';
    }

    // 4. Application Logic
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.py',
      '.go',
      '.rs',
      '.java',
      '.kt',
      '.c',
      '.cpp',
      '.h',
      '.cs',
      '.rb',
      '.php',
      '.swift',
    ];

    if (codeExtensions.some((ext) => lower.endsWith(ext))) {
      return 'application_logic';
    }

    return 'other';
  }

  /**
   * Process raw GitHub file objects into bounded ChangedFile array
   */
  processFiles(rawFiles: any[]): { files: ChangedFile[]; isTruncated: boolean } {
    const isTruncated = rawFiles.length > MAX_FILES_PROCESSED;
    const boundedFiles = rawFiles.slice(0, MAX_FILES_PROCESSED);

    const files: ChangedFile[] = boundedFiles.map((f) => {
      let patchExcerpt: string | null = null;
      let isPatchTruncated = false;

      if (f.patch) {
        if (f.patch.length > MAX_PATCH_CHARS) {
          patchExcerpt = `${f.patch.slice(0, MAX_PATCH_CHARS)}\n... [truncated ${f.patch.length - MAX_PATCH_CHARS} characters]`;
          isPatchTruncated = true;
        } else {
          patchExcerpt = f.patch;
        }
      }

      const filename = f.filename || 'unknown';
      const category = this.classifyFile(filename);

      return {
        filename,
        status: f.status || 'modified',
        additions: f.additions || 0,
        deletions: f.deletions || 0,
        changes: f.changes || (f.additions || 0) + (f.deletions || 0),
        patch_excerpt: patchExcerpt,
        is_truncated: isPatchTruncated,
        category,
        raw_url: f.raw_url || null,
      };
    });

    return { files, isTruncated };
  }

  /**
   * Detect transparent investigation signals from files and patches
   */
  detectSignals(files: ChangedFile[], totalAdditions: number, totalDeletions: number): ReviewSignal[] {
    const signals: ReviewSignal[] = [];

    let hasAuthSignal = false;
    let hasConfigSignal = false;
    let hasDependencySignal = false;
    let hasValidationSignal = false;
    let hasMigrationSignal = false;

    for (const file of files) {
      const lowerPath = file.filename.toLowerCase();
      const lowerPatch = (file.patch_excerpt || '').toLowerCase();

      // Heuristic 1: Authentication / Authorization / Crypto / Secrets
      if (
        !hasAuthSignal &&
        (lowerPath.includes('auth') ||
          lowerPath.includes('login') ||
          lowerPath.includes('token') ||
          lowerPath.includes('session') ||
          lowerPath.includes('crypto') ||
          lowerPath.includes('permission') ||
          lowerPath.includes('password') ||
          lowerPatch.includes('jwt') ||
          lowerPatch.includes('bcrypt') ||
          lowerPatch.includes('oauth'))
      ) {
        signals.push({
          severity: 'high',
          code: 'SIG_AUTH_SECURITY',
          title: 'Authentication & Security Boundary Modified',
          file_path: file.filename,
          explanation:
            'Changes touch authentication, credential handling, or security boundaries. Review access control logic, token handling, and session validation.',
          evidence_reference: `${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`,
        });
        hasAuthSignal = true;
      }

      // Heuristic 2: Database Migration / Schema
      if (
        !hasMigrationSignal &&
        (lowerPath.includes('migration') ||
          lowerPath.includes('schema') ||
          lowerPath.includes('/migrations/') ||
          lowerPath.endsWith('.prisma') ||
          lowerPath.endsWith('.sql'))
      ) {
        signals.push({
          severity: 'high',
          code: 'SIG_DB_MIGRATION',
          title: 'Database Schema or Migration Modified',
          file_path: file.filename,
          explanation:
            'Database schema or migration file altered. Verify data migration safety, zero-downtime compatibility, and index performance.',
          evidence_reference: `${file.filename} (${file.status})`,
        });
        hasMigrationSignal = true;
      }

      // Heuristic 3: Configuration & Environment
      if (
        !hasConfigSignal &&
        (lowerPath.startsWith('.env') ||
          lowerPath.includes('config') ||
          lowerPath.includes('dockerfile') ||
          lowerPath.includes('docker-compose'))
      ) {
        signals.push({
          severity: 'medium',
          code: 'SIG_CONFIG_ENV',
          title: 'Runtime Configuration / Environment Altered',
          file_path: file.filename,
          explanation:
            'Configuration or deployment specs were modified. Ensure no sensitive secrets or unexpected production environment overrides were added.',
          evidence_reference: `${file.filename} (${file.status})`,
        });
        hasConfigSignal = true;
      }

      // Heuristic 4: Dependency Manifests
      if (
        !hasDependencySignal &&
        (lowerPath.endsWith('package.json') ||
          lowerPath.endsWith('cargo.toml') ||
          lowerPath.endsWith('requirements.txt') ||
          lowerPath.endsWith('go.mod'))
      ) {
        signals.push({
          severity: 'medium',
          code: 'SIG_DEPENDENCY_CHANGE',
          title: 'Third-Party Dependency Manifest Changed',
          file_path: file.filename,
          explanation:
            'External dependencies modified. Verify package reputation, license compatibility, and whether versions are securely pinned.',
          evidence_reference: `${file.filename} (${file.status})`,
        });
        hasDependencySignal = true;
      }

      // Heuristic 5: Input Validation & Controller Routes
      if (
        !hasValidationSignal &&
        (lowerPath.includes('validation') ||
          lowerPath.includes('sanitize') ||
          lowerPatch.includes('zod') ||
          lowerPatch.includes('joi') ||
          lowerPatch.includes('validator') ||
          lowerPath.includes('route') ||
          lowerPath.includes('controller'))
      ) {
        signals.push({
          severity: 'medium',
          code: 'SIG_INPUT_VALIDATION',
          title: 'Input Validation / Endpoint Layer Touched',
          file_path: file.filename,
          explanation:
            'Changes affect request routing or data validation. Verify boundary checking and injection safety.',
          evidence_reference: `${file.filename} (${file.status})`,
        });
        hasValidationSignal = true;
      }
    }

    // Heuristic 6: Logic Changed Without Accompanying Tests
    const logicFiles = files.filter((f) => f.category === 'application_logic');
    const testFiles = files.filter((f) => f.category === 'tests');
    if (logicFiles.length >= 2 && testFiles.length === 0) {
      signals.push({
        severity: 'high',
        code: 'SIG_UNTESTED_LOGIC',
        title: 'Application Logic Modified Without Tests',
        explanation: `${logicFiles.length} application logic file(s) were changed, but no test files were created or modified in this pull request.`,
        evidence_reference: `${logicFiles.length} logic files changed; 0 test files changed`,
      });
    }

    // Heuristic 7: High Churn / Large Diff
    const totalLines = totalAdditions + totalDeletions;
    if (totalLines > 500 || files.length >= 15) {
      signals.push({
        severity: 'medium',
        code: 'SIG_HIGH_CHURN',
        title: 'High-Volume Diff (Review Fatigue Risk)',
        explanation: `Pull request modifies ${files.length} files across +${totalAdditions}/-${totalDeletions} lines. Recommend reviewing in prioritized stages.`,
        evidence_reference: `${files.length} files, ${totalLines} total line changes`,
      });
    }

    return signals;
  }

  /**
   * Build complete ChangeMap data structure
   */
  buildChangeMap(rawFiles: any[], totalAdditions: number, totalDeletions: number): ChangeMap {
    const { files, isTruncated } = this.processFiles(rawFiles);

    const categories: Record<FileCategory, ChangedFile[]> = {
      application_logic: [],
      tests: [],
      config_dependencies: [],
      documentation: [],
      other: [],
    };

    for (const file of files) {
      categories[file.category].push(file);
    }

    const category_counts: Record<FileCategory, number> = {
      application_logic: categories.application_logic.length,
      tests: categories.tests.length,
      config_dependencies: categories.config_dependencies.length,
      documentation: categories.documentation.length,
      other: categories.other.length,
    };

    const signals = this.detectSignals(files, totalAdditions, totalDeletions);

    return {
      total_files: rawFiles.length,
      total_additions: totalAdditions,
      total_deletions: totalDeletions,
      is_file_list_truncated: isTruncated,
      categories,
      category_counts,
      investigation_signals: signals,
    };
  }
}
