import {
  ExceptionFilter,
  Injectable,
  type ExceptionFilterInterface,
  type ExecutionContext,
} from '@nitrostack/core';

interface PlaidErrorBody {
  error_type?: string;
  error_code?: string;
  error_message?: string;
  display_message?: string;
  request_id?: string;
}

/**
 * Plaid and Stripe both fail with dense, provider-shaped payloads. Surfaced raw
 * into a chat transcript they read as noise. This turns each one into a single
 * sentence plus a concrete next step, which is what an operator actually needs.
 */
@ExceptionFilter()
@Injectable({ deps: [] })
export class InstantPulseExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext) {
    const plaid = readPlaidError(exception);
    if (plaid) {
      context.logger.error('Plaid request failed', {
        tool: context.toolName,
        code: plaid.error_code,
        requestId: plaid.request_id,
      });

      return {
        ok: false,
        provider: 'plaid',
        errorCode: plaid.error_code ?? 'PLAID_ERROR',
        message: plaid.display_message || plaid.error_message || 'Plaid rejected the request.',
        nextAction: plaidNextAction(plaid.error_code),
        requestId: plaid.request_id,
      };
    }

    const stripe = readStripeError(exception);
    if (stripe) {
      context.logger.error('Stripe request failed', {
        tool: context.toolName,
        code: stripe.code,
      });

      return {
        ok: false,
        provider: 'stripe',
        errorCode: stripe.code ?? stripe.type ?? 'STRIPE_ERROR',
        message: stripe.message,
        nextAction:
          'Confirm STRIPE_SECRET_KEY is a test-mode key (sk_test_…) and that Connect is enabled ' +
          'on the account. Unset the key entirely to fall back to simulated onboarding.',
      };
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    context.logger.error('Tool execution failed', { tool: context.toolName, message });

    return {
      ok: false,
      provider: 'instantpulse',
      errorCode: 'TOOL_ERROR',
      message,
    };
  }
}

function readPlaidError(exception: unknown): PlaidErrorBody | null {
  const response = (exception as { response?: { data?: unknown } })?.response;
  const data = response?.data as PlaidErrorBody | undefined;
  if (data && (data.error_code || data.error_type)) return data;
  return null;
}

function readStripeError(exception: unknown): { type?: string; code?: string; message: string } | null {
  const err = exception as { type?: string; code?: string; message?: string; raw?: unknown };
  if (typeof err?.type === 'string' && err.type.startsWith('Stripe')) {
    return { type: err.type, code: err.code, message: err.message ?? 'Stripe request failed.' };
  }
  if (err?.raw && typeof err.code === 'string') {
    return { type: err.type, code: err.code, message: err.message ?? 'Stripe request failed.' };
  }
  return null;
}

function plaidNextAction(code?: string): string {
  switch (code) {
    case 'INVALID_API_KEYS':
    case 'INVALID_CREDENTIALS':
      return 'Check PLAID_CLIENT_ID and PLAID_SECRET against your Plaid dashboard Sandbox keys.';
    case 'ITEM_LOGIN_REQUIRED':
      return 'The sandbox item needs re-linking. Run plaid_connect_sandbox_bank again for this application.';
    case 'PRODUCT_NOT_READY':
      return 'Plaid is still preparing transactions for this sandbox item. Retry in a few seconds.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Sandbox rate limit hit. Wait a moment before retrying.';
    default:
      return 'Verify PLAID_ENV=sandbox and that your Sandbox keys are active. Unset PLAID_CLIENT_ID to fall back to simulated bank data.';
  }
}
