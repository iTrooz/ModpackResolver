import pino, { DestinationStream } from 'pino';

export enum LogLevel {
    Fatal = 'fatal',
    Error = 'error',
    Warn = 'warn',
    Info = 'info',
    Debug = 'debug',
    Trace = 'trace'
}
let maybePretty: DestinationStream | undefined = undefined;
if (typeof window === 'undefined') {
    const pinoPretty = (await import("pino-pretty")).default;
    maybePretty = pinoPretty();
}
const logger = pino({
    level: 'info', // default level
    base: {
        pid: false,
    }
}, maybePretty);

class LoggerConfig {
    static setLevel(level: LogLevel): void {
        logger.level = level;
    }
}

export { logger, LoggerConfig };
