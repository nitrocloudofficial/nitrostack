import { ExceptionFilter } from '@nitrostack/core';
import type { ExceptionFilterInterface, ExecutionContext } from '@nitrostack/core';
import { TxnError } from '../services/txn-error.js';

/**
 * @nitrostack/core has no per-exception-type @Catch(Type) decorator — filters are
 * registered with plain @ExceptionFilter() and receive every exception, so this
 * one only handles TxnError and rethrows anything else for another filter (or the
 * default unhandled-error path) to deal with.
 *
 * Ensures TxnErrors (including a PARTIAL rollback's partialReport, when set)
 * come back as a structured response instead of an unhandled throw.
 */
@ExceptionFilter()
export class TxnExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): unknown {
    if (!(exception instanceof TxnError)) {
      throw exception;
    }

    context.logger.error('Transaction error', { code: exception.code, detail: exception.detail });

    return {
      isError: true,
      code: exception.code,
      message: exception.operatorMessage ?? exception.message,
      report: exception.partialReport ?? null,
    };
  }
}
