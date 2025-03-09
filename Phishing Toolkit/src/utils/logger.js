import fs from 'fs';
import path from 'path';
import { Config } from './config-manager.js';

class Logger {
    constructor() {
        this.config = new Config();
        this.logLevel = this.config.get('logging.level', 'info');
        this.accessLogPath = this.config.get('logging.access_log', './storage/logs/access.log');
        this.errorLogPath = this.config.get('logging.error_log', './storage/logs/error.log');

        // Ensure log directories exist
        this.ensureLogDirectories();
    }

    // Ensure log directories are created
    ensureLogDirectories() {
        const logDirs = [
            path.dirname(this.accessLogPath),
            path.dirname(this.errorLogPath)
        ];

        logDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Log levels
    log(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = JSON.stringify({
            timestamp,
            level,
            message,
            ...metadata
        }) + '\n';

        // Determine log file based on level
        const logPath = level === 'error' ? this.errorLogPath : this.accessLogPath;

        // Write to file
        fs.appendFile(logPath, logEntry, (err) => {
            if (err) {
                console.error('Logging error:', err);
            }
        });

        // Console output
        this.consoleOutput(level, message, metadata);
    }

    // Console output with color
    consoleOutput(level, message, metadata) {
        const colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[90m'  // Gray
        };

        const color = colors[level] || '\x1b[0m';
        const reset = '\x1b[0m';

        // Output based on log level
        if (this.shouldLog(level)) {
            console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, metadata);
        }
    }

    // Determine if message should be logged
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex <= currentLevelIndex;
    }

    // Convenience methods
    error(message, metadata = {}) {
        this.log('error', message, metadata);
    }

    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }

    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }

    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }
}

export default Logger;