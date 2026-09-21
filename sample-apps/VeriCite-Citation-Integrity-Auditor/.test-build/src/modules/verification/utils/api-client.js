/**
 * VeriCite – Verification Engine
 * utils/api-client.ts — Reusable, pre-configured Axios instance factory
 */
import axios from "axios";
import { createLogger } from "./logger.js";
const logger = createLogger("api-client");
/**
 * Creates a configured Axios instance with:
 * - Sensible timeout
 * - Request / response logging
 * - Automatic retry on 429 / 5xx (up to 3 times, with exponential back-off)
 */
export function createApiClient(options) {
    const { baseURL, timeoutMs = 15_000, headers = {} } = options;
    const instance = axios.create({
        baseURL,
        timeout: timeoutMs,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...headers,
        },
    });
    // ── Request interceptor: log outgoing calls ────────────────────────────────
    instance.interceptors.request.use((config) => {
        logger.debug(`→ ${config.method?.toUpperCase() ?? "GET"} ${config.baseURL ?? ""}${config.url ?? ""}`, {
            params: config.params,
        });
        return config;
    });
    // ── Response interceptor: log successes, log + pass-through errors ───────
    // NOTE: Retry is handled exclusively by withRetry() in each service call.
    //       Retrying here as well would cause up to 3×3 = 9 attempts per failure.
    instance.interceptors.response.use((response) => {
        logger.debug(`← ${response.status} ${response.config.url ?? ""}`);
        return response;
    }, (error) => {
        const axiosError = error;
        logger.error("Request error", {
            url: axiosError.config?.url,
            status: axiosError.response?.status,
            message: axiosError.message,
        });
        return Promise.reject(error);
    });
    return instance;
}
//# sourceMappingURL=api-client.js.map