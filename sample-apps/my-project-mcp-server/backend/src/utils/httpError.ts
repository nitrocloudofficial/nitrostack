export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const notFoundError = (message: string) => new HttpError(404, message);
export const badRequestError = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
