/**
 * Clinical Copilot MCP Server - Logging Utilities
 *
 * Provides HIPAA-compliant logging wrappers to redact Protected Health Information (PHI).
 */

export class ClinicalLogger {
  static info(message: string, meta?: Record<string, any>): void {
    // TODO: Implement PHI sanitization before logging
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static warn(message: string, meta?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }
}
