export class Logger {
    private static readonly LOG_PREFIX = '[Voice Orchestrator]';

    static info(message: string, ...args: any[]): void {
        console.log(`${this.LOG_PREFIX} INFO: ${message}`, ...args);
    }

    static warn(message: string, ...args: any[]): void {
        console.warn(`${this.LOG_PREFIX} WARN: ${message}`, ...args);
    }

    static error(message: string, error?: any, ...args: any[]): void {
        console.error(`${this.LOG_PREFIX} ERROR: ${message}`, error, ...args);
    }

    static debug(message: string, ...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`${this.LOG_PREFIX} DEBUG: ${message}`, ...args);
        }
    }

    static trace(message: string, ...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.trace(`${this.LOG_PREFIX} TRACE: ${message}`, ...args);
        }
    }
}
