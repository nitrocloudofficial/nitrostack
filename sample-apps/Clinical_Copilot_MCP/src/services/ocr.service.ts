import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
const pdf = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule);

/**
 * Clinical Copilot MCP Server - OCR Service
 *
 * Extracts plain clinical text from medical report PDFs, images, data URLs, or HTTP storage URLs.
 */
@Injectable()
export class OcrService {
  /**
   * Extracts plain text from medical report buffer, base64 payload, or HTTP file URL.
   */
  async extractTextFromReport(fileContent: Buffer | string, mimeType: string = 'application/pdf'): Promise<string> {
    try {
      let buffer: Buffer;

      if (typeof fileContent === 'string' && (fileContent.startsWith('http://') || fileContent.startsWith('https://'))) {
        try {
          const response = await fetch(fileContent);
          if (response.ok) {
            buffer = Buffer.from(await response.arrayBuffer());
          } else {
            console.warn(`[OcrService] Storage URL fetch returned ${response.status} ${response.statusText}. Checking alternative inputs...`);
            buffer = this.resolveStringToBuffer(fileContent);
          }
        } catch (fetchErr: any) {
          buffer = this.resolveStringToBuffer(fileContent);
        }
      } else if (Buffer.isBuffer(fileContent)) {
        buffer = fileContent;
      } else if (typeof fileContent === 'string') {
        buffer = this.resolveStringToBuffer(fileContent);
      } else {
        throw new Error('Invalid file content format provided for OCR extraction.');
      }

      const textContent = await this.parsePdfBuffer(buffer);
      if (textContent && textContent.trim().length > 10) {
        return textContent.trim();
      }

      throw new Error('OCR extraction completed, but the uploaded document contained no readable text content.');
    } catch (error: any) {
      throw new Error(`OCR text extraction failed: ${error.message}`);
    }
  }

  /**
   * Resolves a string payload (file path, data URL, base64, or filename) to a Buffer
   */
  private resolveStringToBuffer(strPayload: string): Buffer {
    const trimmed = strPayload.trim();

    // 1. Check if string is a valid file path on disk
    const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(resolvedPath)) {
      return fs.readFileSync(resolvedPath);
    }

    // 2. Check if basename exists in workspace root (e.g. 04_Discharge_Summary.pdf)
    const baseName = path.basename(trimmed);
    const localInCwd = path.resolve(process.cwd(), baseName);
    if (fs.existsSync(localInCwd)) {
      return fs.readFileSync(localInCwd);
    }

    // 3. Check for data URL format
    if (trimmed.startsWith('data:')) {
      const base64Data = trimmed.split(',')[1] || '';
      return Buffer.from(base64Data, 'base64');
    }

    // 4. Check if base64 encoded string
    try {
      const decoded = Buffer.from(trimmed, 'base64');
      if (decoded.length > 10 && (decoded.toString('utf-8', 0, 4) === '%PDF' || decoded.toString('utf-8').includes('Patient'))) {
        return decoded;
      }
    } catch { }

    // 5. If HTTP/HTTPS URL failed to fetch, do NOT return URL string as text
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      throw new Error(`Storage URL could not be fetched (${trimmed}). Ensure Supabase Storage bucket is accessible or file path is valid.`);
    }

    return Buffer.from(trimmed, 'utf-8');
  }

  /**
   * Extracts clean readable text from PDF buffers using pdf-parse.
   */
  private async parsePdfBuffer(buffer: Buffer): Promise<string> {
    const isPdf = buffer.length > 4 && buffer.toString('utf-8', 0, 10).includes('%PDF');
    if (!isPdf) {
      return buffer.toString('utf-8');
    }

    try {
      const pdfFunc = typeof pdf === 'function' ? pdf : (pdf as any).default || pdf;
      if (typeof pdfFunc !== 'function') {
        throw new Error('Loaded pdf-parse module is not callable.');
      }
      const data = await pdfFunc(buffer);
      return data.text ? data.text.trim() : '';
    } catch (error: any) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }
}
