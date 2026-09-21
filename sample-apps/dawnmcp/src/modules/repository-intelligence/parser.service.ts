import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';

// ─── Types ────────────────────────────────────────────────────────────

/** An import extracted from a source file. */
export interface ParsedImport {
  source: string;
  isRelative: boolean;
}

/** A function or method extracted from a source file. */
export interface ParsedFunction {
  name: string;
  isExported: boolean;
  isAsync: boolean;
  line: number;
}

/** A class extracted from a source file. */
export interface ParsedClass {
  name: string;
  isExported: boolean;
  methods: string[];
  line: number;
}

/** Parse confidence rating. */
export type ParseConfidence = 'ok' | 'partial' | 'failed';

/** Complete parsed structure of a single source file. */
export interface ParsedFile {
  filePath: string;
  language: string;
  imports: ParsedImport[];
  exports: string[];
  functions: ParsedFunction[];
  classes: ParsedClass[];
  lineCount: number;
  hasDefaultExport: boolean;
  parseConfidence: ParseConfidence;
}

// ─── Service ──────────────────────────────────────────────────────────

/**
 * Parser Service
 *
 * Extracts structural information from source files using TypeScript
 * compiler API for TS/JS files and regex patterns for other languages.
 * Provides a parseConfidence flag ('ok' | 'partial' | 'failed').
 */
@Injectable()
export class ParserService {
  /**
   * Parse a source file and extract its structure.
   */
  async parseFile(filePath: string, language?: string): Promise<ParsedFile> {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return {
        filePath,
        language: language ?? 'Unknown',
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        lineCount: 0,
        hasDefaultExport: false,
        parseConfidence: 'failed',
      };
    }

    const detectedLang = language ?? this.detectLanguage(filePath);
    const lines = content.split('\n');

    if (['TypeScript', 'JavaScript'].includes(detectedLang)) {
      return this.parseTypeScript(filePath, content, lines.length);
    }

    if (detectedLang === 'Python') {
      return this.parsePython(filePath, content, lines.length);
    }

    return this.parseGeneric(filePath, content, detectedLang, lines.length);
  }

  private async parseTypeScript(
    filePath: string,
    content: string,
    lineCount: number,
  ): Promise<ParsedFile> {
    let ts: typeof import('typescript');
    try {
      ts = await import('typescript');
    } catch {
      return this.parseGeneric(filePath, content, 'TypeScript', lineCount);
    }

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
          ? ts.ScriptKind.TSX
          : ts.ScriptKind.TS,
      );

      const imports: ParsedImport[] = [];
      const exports: string[] = [];
      const functions: ParsedFunction[] = [];
      const classes: ParsedClass[] = [];
      let hasDefaultExport = false;

      const visit = (node: import('typescript').Node): void => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
          const source = (node.moduleSpecifier as import('typescript').StringLiteral).text;
          imports.push({
            source,
            isRelative: source.startsWith('.') || source.startsWith('/'),
          });
        }

        if (ts.isFunctionDeclaration(node) && node.name) {
          const isExported = hasModifier(ts, node, ts.SyntaxKind.ExportKeyword);
          functions.push({
            name: node.name.text,
            isExported,
            isAsync: hasModifier(ts, node, ts.SyntaxKind.AsyncKeyword),
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
          if (isExported) exports.push(node.name.text);
        }

        if (ts.isVariableStatement(node) && node.declarationList.declarations.length > 0) {
          for (const decl of node.declarationList.declarations) {
            if (
              ts.isIdentifier(decl.name) &&
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
            ) {
              const isExported = hasModifier(ts, node, ts.SyntaxKind.ExportKeyword);
              functions.push({
                name: decl.name.text,
                isExported,
                isAsync: hasModifier(ts, decl.initializer, ts.SyntaxKind.AsyncKeyword),
                line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              });
              if (isExported) exports.push(decl.name.text);
            }
          }
        }

        if (ts.isClassDeclaration(node) && node.name) {
          const isExported = hasModifier(ts, node, ts.SyntaxKind.ExportKeyword);
          const methods: string[] = [];

          for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
              methods.push(member.name.text);
            }
          }

          classes.push({
            name: node.name.text,
            isExported,
            methods,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
          if (isExported) exports.push(node.name.text);
        }

        if (ts.isExportAssignment(node)) {
          hasDefaultExport = true;
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      return {
        filePath,
        language: 'TypeScript',
        imports,
        exports,
        functions,
        classes,
        lineCount,
        hasDefaultExport,
        parseConfidence: 'ok',
      };
    } catch {
      return {
        ...this.parseGeneric(filePath, content, 'TypeScript', lineCount),
        parseConfidence: 'partial',
      };
    }
  }

  private parsePython(filePath: string, content: string, lineCount: number): ParsedFile {
    const imports: ParsedImport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const exports: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const importMatch = trimmed.match(/^(?:from\s+([\w.]+)\s+)?import\s+(.+)/);
      if (importMatch) {
        const source = importMatch[1] || importMatch[2].split(',')[0].trim();
        imports.push({ source, isRelative: source.startsWith('.') });
      }

      const funcMatch = trimmed.match(/^(async\s+)?def\s+(\w+)\s*\(/);
      if (funcMatch) {
        const name = funcMatch[2];
        const isAsync = !!funcMatch[1];
        const isExported = !name.startsWith('_');
        functions.push({ name, isExported, isAsync, line: i + 1 });
        if (isExported) exports.push(name);
      }

      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[1];
        const methods: string[] = [];

        for (let j = i + 1; j < lines.length && j < i + 100; j++) {
          const methodLine = lines[j];
          if (methodLine.match(/^\S/) && j > i + 1) break;
          const methodMatch = methodLine.trim().match(/^(?:async\s+)?def\s+(\w+)\s*\(/);
          if (methodMatch) methods.push(methodMatch[1]);
        }

        classes.push({
          name: className,
          isExported: !className.startsWith('_'),
          methods,
          line: i + 1,
        });
        if (!className.startsWith('_')) exports.push(className);
      }
    }

    return {
      filePath,
      language: 'Python',
      imports,
      exports,
      functions,
      classes,
      lineCount,
      hasDefaultExport: false,
      parseConfidence: 'ok',
    };
  }

  private parseGeneric(filePath: string, content: string, language: string, lineCount: number): ParsedFile {
    const imports: ParsedImport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const exports: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const importMatch =
        line.match(/import\s+["'](.+?)["']/) ||
        line.match(/require\s*\(\s*["'](.+?)["']\s*\)/) ||
        line.match(/from\s+["'](.+?)["']/);
      if (importMatch) {
        imports.push({
          source: importMatch[1],
          isRelative: importMatch[1].startsWith('.') || importMatch[1].startsWith('/'),
        });
      }

      const funcMatch =
        line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/) ||
        line.match(/(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/) ||
        line.match(/func\s+(\w+)/);
      if (funcMatch) {
        functions.push({
          name: funcMatch[1],
          isExported: line.includes('export') || line.includes('pub'),
          isAsync: line.includes('async'),
          line: i + 1,
        });
      }

      const classMatch =
        line.match(/(?:export\s+)?class\s+(\w+)/) ||
        line.match(/(?:pub\s+)?struct\s+(\w+)/) ||
        line.match(/type\s+(\w+)\s+struct/);
      if (classMatch) {
        classes.push({
          name: classMatch[1],
          isExported: line.includes('export') || line.includes('pub') || /^[A-Z]/.test(classMatch[1]),
          methods: [],
          line: i + 1,
        });
      }
    }

    return {
      filePath,
      language,
      imports,
      exports,
      functions,
      classes,
      lineCount,
      hasDefaultExport: false,
      parseConfidence: 'partial',
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TypeScript',
      '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++', '.cc': 'C++',
      '.c': 'C',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
    };
    return map[ext] ?? 'Unknown';
  }
}

function hasModifier(
  ts: typeof import('typescript'),
  node: import('typescript').Node,
  kind: import('typescript').SyntaxKind,
): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === kind) ?? false;
}
