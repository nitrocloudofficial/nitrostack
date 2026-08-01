import { Logger } from './Logger.utility.js';
import { ApplicationError } from '../errors/ApplicationError.js';

export class ErrorHandler {
  public static handle(error: unknown, contextMsg: string = 'An error occurred'): ApplicationError {
    if (error instanceof ApplicationError) {
      Logger.error(`${contextMsg}: ${error.message}`, error, { code: error.code, details: error.details });
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const appErr = new ApplicationError(`${contextMsg}: ${message}`);
    Logger.error(appErr.message, error);
    return appErr;
  }
}
