import pino from 'pino';
import pinoPretty from 'pino-pretty';

export enum LogLevel {
    Fatal = 'fatal',
    Error = 'error',
    Warn = 'warn',
    Info = 'info',
    Debug = 'debug',
    Trace = 'trace'
}

const logger = pino({
    level: 'info', // default level
    base: {
        pid: false,
    }
}, pinoPretty());

class LoggerConfig {
    static setLevel(level: LogLevel): void {
        logger.level = level;
    }
}

export { logger, LoggerConfig };
