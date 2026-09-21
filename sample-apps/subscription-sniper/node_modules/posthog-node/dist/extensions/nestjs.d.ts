import { Observable } from 'rxjs';
import { PostHogBackendClient } from '../client';
interface HttpArgumentsHost {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
}
interface ExecutionContext {
    switchToHttp(): HttpArgumentsHost;
}
interface CallHandler<T = any> {
    handle(): Observable<T>;
}
interface NestInterceptor<T = any, R = any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<R>;
}
export interface ExceptionCaptureOptions {
    /** Minimum HTTP status code to capture. Exceptions with a lower status (e.g. 4xx) are skipped. @default 500 */
    minStatusToCapture?: number;
}
export interface PostHogInterceptorOptions {
    /** Enable exception capture. Pass `true` for defaults or an object to configure. @default false */
    captureExceptions?: boolean | ExceptionCaptureOptions;
}
export declare class PostHogInterceptor implements NestInterceptor {
    private posthog;
    private captureExceptions;
    private minStatusToCapture;
    constructor(posthog: PostHogBackendClient, options?: PostHogInterceptorOptions);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
export {};
//# sourceMappingURL=nestjs.d.ts.map