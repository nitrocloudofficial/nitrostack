/**
 * CREED-Lite — Exception Filter
 *
 * Catches any error thrown during tool execution and converts it into a
 * structured, user-friendly response instead of a raw stack trace.
 */

import { ExceptionFilter, ExecutionContext } from '@nitrostack/core';
import type { ExceptionFilterInterface } from '@nitrostack/core';

@ExceptionFilter()
export class CREEDExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, _context: ExecutionContext): unknown {
    const error = exception instanceof Error ? exception : new Error(String(exception));
    const code = (exception as { code?: string })?.code || 'CREED_INTERNAL_ERROR';

    return {
      error: true,
      code,
      message: error.message,
      suggestion: this.getSuggestion(code),
      timestamp: new Date().toISOString(),
    };
  }

  private getSuggestion(code: string): string {
    switch (code) {
      case 'FRAUD_RISK_DETECTED':
        return 'The proposed action was flagged for fraud risk. Review the flagged vector and adjust the action accordingly.';
      case 'VALIDATION_ERROR':
        return 'One or more input fields are invalid. Please check the input schema and try again.';
      case 'PROFILE_INCOMPLETE':
        return 'The applicant profile is missing required fields. Provide all fields listed in the input schema.';
      default:
        return 'Please verify your input parameters and try again. If the issue persists, check the server logs.';
    }
  }
}
