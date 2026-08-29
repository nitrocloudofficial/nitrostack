/**
 * VeriCite – Verification Engine
 * utils/logger.ts — Structured, levelled console logger
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const LEVEL_COLORS = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m", // green
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";
function getEnvLevel() {
    const raw = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
    if (raw in LOG_LEVELS)
        return raw;
    return "info";
}
function timestamp() {
    return new Date().toISOString();
}
function formatMessage(level, namespace, message, meta) {
    const color = LEVEL_COLORS[level];
    const prefix = `${color}[${level.toUpperCase()}]${RESET} ${timestamp()} [${namespace}]`;
    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    return `${prefix} ${message}${metaStr}`;
}
export class Logger {
    namespace;
    minLevel;
    constructor(namespace) {
        this.namespace = namespace;
        this.minLevel = LOG_LEVELS[getEnvLevel()];
    }
    log(level, message, meta) {
        if (LOG_LEVELS[level] < this.minLevel)
            return;
        const formatted = formatMessage(level, this.namespace, message, meta);
        if (level === "error") {
            console.error(formatted);
        }
        else if (level === "warn") {
            console.warn(formatted);
        }
        else {
            console.log(formatted);
        }
    }
    debug(message, meta) {
        this.log("debug", message, meta);
    }
    info(message, meta) {
        this.log("info", message, meta);
    }
    warn(message, meta) {
        this.log("warn", message, meta);
    }
    error(message, meta) {
        this.log("error", message, meta);
    }
}
/** Factory helper — preferred over constructing Logger directly. */
export function createLogger(namespace) {
    return new Logger(namespace);
}
//# sourceMappingURL=logger.js.map