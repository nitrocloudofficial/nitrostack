import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync } from 'fs';
import { Injectable } from '@nitrostack/core';
import type { AuthoritativeSource } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VALID_CLASSIFICATIONS = ['public', 'internal', 'confidential'] as const;

@Injectable()
export class PdfIngestionService {
  /**
   * Scans a directory for PDFs, extracts text synchronously via a worker script,
   * and parses out structured facts using regex.
   */
  public loadPdfSources(pdfsDir: string): AuthoritativeSource[] {
    if (!existsSync(pdfsDir)) {
      return [];
    }

    const files = readdirSync(pdfsDir).filter((f) => f.endsWith('.pdf'));
    const sources: AuthoritativeSource[] = [];

    // We use a small inline CJS script so we don't have to worry about
    // TS compiler copying worker files to .test-dist or dist directories!
    const inlineParser = `
      const PDFParser = require('pdf2json');
      const parser = new PDFParser(this, 1);
      parser.on('pdfParser_dataError', errData => {
        console.error(errData.parserError);
        process.exit(1);
      });
      parser.on('pdfParser_dataReady', pdfData => {
        console.log(parser.getRawTextContent());
      });
      parser.loadPDF(process.argv[1]);
    `;

    for (const file of files) {
      const filePath = join(pdfsDir, file);
      try {
        // Use execFileSync with argument array to prevent shell injection
        const scriptContent = inlineParser.replace(/\n/g, ' ');
        const output = execFileSync('node', ['-e', scriptContent, filePath], {
          encoding: 'utf-8',
        });
        const source = this.parseTextToSource(output, file);
        if (source) {
          sources.push(source);
        }
      } catch (error) {
        console.error(`Failed to parse PDF ${file}:`, error);
      }
    }

    return sources;
  }

  private parseTextToSource(
    text: string,
    filename: string,
  ): AuthoritativeSource | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    
    // Very basic extraction logic based on the generated PDF structure
    const titleMatch = lines.find((l) => !l.includes(':'));
    const title = titleMatch || 'Unknown PDF Policy';
    const id = filename.replace('.pdf', '');

    const department = this.extractField(lines, 'Department:');
    const version = this.extractField(lines, 'Version:');
    const effective_date = this.extractField(lines, 'Effective Date:');
    
    const owner = this.extractField(lines, 'owner:');
    const last_updated = this.extractField(lines, 'last_updated:');
    const rawClassification = this.extractField(lines, 'classification:');
    const classification: 'public' | 'internal' | 'confidential' =
      rawClassification && VALID_CLASSIFICATIONS.includes(rawClassification as typeof VALID_CLASSIFICATIONS[number])
        ? (rawClassification as 'public' | 'internal' | 'confidential')
        : 'internal';

    const facts: Record<string, string> = {};
    
    // Extract facts (assuming they are formatted as key: value after "Policy Facts")
    let inFactsSection = false;
    for (const line of lines) {
      if (line.includes('Policy Facts')) {
        inFactsSection = true;
        continue;
      }
      if (line.includes('Metadata')) {
        inFactsSection = false;
        continue;
      }
      
      if (inFactsSection && line.includes(':')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          // Avoid metadata keys
          if (!['owner', 'last_updated', 'classification'].includes(key)) {
            facts[key] = value;
          }
        }
      }
    }

    return {
      id,
      title,
      department: department || 'Unknown',
      version: version || '1.0',
      effective_date: effective_date || new Date().toISOString().split('T')[0],
      facts,
      metadata: {
        owner: owner || 'Unknown Owner',
        last_updated: last_updated || new Date().toISOString(),
        classification,
      },
    };
  }

  private extractField(lines: string[], prefix: string): string | undefined {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.substring(prefix.length).trim() : undefined;
  }
}
