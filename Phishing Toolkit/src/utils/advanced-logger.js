import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class AdvancedLogger {
    constructor(options = {}) {
        this.logDirectory = options.logDirectory || path.resolve('./storage/logs');
        this.maxLogFiles = options.maxLogFiles || 10;
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB

        this.ensureLogDirectory();
    }

    // Ensure log directory exists
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
    }

    // Generate unique log filename
    generateLogFilename(type) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        return `${type}-${timestamp}-${randomSuffix}.log`;
    }

    // Write log entry
    writeLog(type, message, metadata = {}) {
        const logEntry = this.formatLogEntry(type, message, metadata);
        const logFilename = this.generateLogFilename(type);
        const logPath = path.join(this.logDirectory, logFilename);

        try {
            // Write log entry
            fs.appendFileSync(logPath, logEntry + '\n', { 
                mode: 0o600 // Secure file permissions
            });

            // Rotate logs if needed
            this.rotateLogFiles(type);
        } catch (error) {
            console.error('Log writing failed:', error);
        }
    }

    // Format log entry
    formatLogEntry(type, message, metadata) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type.toUpperCase(),
            message: message,
            metadata: this.sanitizeMetadata(metadata)
        };

        return JSON.stringify(logEntry);
    }

    // Sanitize metadata to remove sensitive information
    sanitizeMetadata(metadata) {
        const sanitized = { ...metadata };
        
        // List of keys to remove or mask
        const sensitiveKeys = [
            'password', 
            'token', 
            'secret', 
            'key'
        ];

        sensitiveKeys.forEach(key => {
            if (sanitized[key]) {
                sanitized[key] = this.maskSensitiveData(sanitized[key]);
            }
        });

        return sanitized;
    }

    // Mask sensitive data
    maskSensitiveData(data) {
        if (typeof data !== 'string') return '[REDACTED]';
        
        if (data.length <= 4) return '****';
        
        return data.slice(0, 2) + '****' + data.slice(-2);
    }

    // Rotate log files
    rotateLogFiles(type) {
        const logFiles = fs.readdirSync(this.logDirectory)
            .filter(file => file.startsWith(type))
            .sort((a, b) => fs.statSync(path.join(this.logDirectory, b)).mtime.getTime() - 
                             fs.statSync(path.join(this.logDirectory, a)).mtime.getTime());

        // Remove excess log files
        while (logFiles.length > this.maxLogFiles) {
            const oldestLogFile = logFiles.pop();
            fs.unlinkSync(path.join(this.logDirectory, oldestLogFile));
        }

        // Check and truncate large log files
        logFiles.forEach(file => {
            const filePath = path.join(this.logDirectory, file);
            const stats = fs.statSync(filePath);
            
            if (stats.size > this.maxLogSize) {
                // Truncate log file
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const lines = fileContent.split('\n');
                
                // Keep last portion of the log
                const truncatedContent = lines.slice(-1000).join('\n');
                
                fs.writeFileSync(filePath, truncatedContent, { 
                    mode: 0o600 
                });
            }
        });
    }

    // Convenience logging methods
    info(message, metadata = {}) {
        this.writeLog('info', message, metadata);
        console.log(`[INFO] ${message}`, metadata);
    }

    warn(message, metadata = {}) {
        this.writeLog('warn', message, metadata);
        console.warn(`[WARN] ${message}`, metadata);
    }

    error(message, metadata = {}) {
        this.writeLog('error', message, metadata);
        console.error(`[ERROR] ${message}`, metadata);
    }

    debug(message, metadata = {}) {
        this.writeLog('debug', message, metadata);
        console.debug(`[DEBUG] ${message}`, metadata);
    }

    // Search log files
    async searchLogs(options = {}) {
        const { 
            type, 
            startDate, 
            endDate, 
            keyword 
        } = options;

        const matchingLogs = [];

        // Read all log files
        const logFiles = fs.readdirSync(this.logDirectory)
            .filter(file => !type || file.startsWith(type));

        for (const file of logFiles) {
            const filePath = path.join(this.logDirectory, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            // Parse and filter log entries
            const logEntries = fileContent.trim().split('\n')
                .map(entry => {
                    try {
                        return JSON.parse(entry);
                    } catch {
                        return null;
                    }
                })
                .filter(entry => entry !== null);

            const filteredEntries = logEntries.filter(entry => {
                // Date range filter
                const matchDate = (!startDate || new Date(entry.timestamp) >= new Date(startDate)) &&
                                  (!endDate || new Date(entry.timestamp) <= new Date(endDate));
                
                // Keyword filter
                const matchKeyword = !keyword || 
                    entry.message.toLowerCase().includes(keyword.toLowerCase());

                return matchDate && matchKeyword;
            });

            matchingLogs.push(...filteredEntries);
        }

        return matchingLogs;
    }
}

export default new AdvancedLogger();