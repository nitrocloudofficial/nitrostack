import { PostHogBackendClient } from '../client';
import type { Request, Response } from 'express';
type ExpressMiddleware = (req: Request, res: Response, next: () => void) => void;
type ExpressErrorMiddleware = (error: MiddlewareError, req: Request, res: Response, next: (error: MiddlewareError) => void) => void;
interface MiddlewareError extends Error {
    status?: number | string;
    statusCode?: number | string;
    status_code?: number | string;
    output?: {
        statusCode?: number | string;
    };
}
export declare function setupExpressRequestContext(_posthog: PostHogBackendClient, app: {
    use: (middleware: ExpressMiddleware) => unknown;
}): void;
export declare function setupExpressErrorHandler(_posthog: PostHogBackendClient, app: {
    use: (middleware: ExpressMiddleware | ExpressErrorMiddleware) => unknown;
}): void;
export {};
//# sourceMappingURL=express.d.ts.map