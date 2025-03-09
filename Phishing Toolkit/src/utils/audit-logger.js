import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class AuditLogger {
    constructor(logPath = './storage/logs/audit.log') {
        this.logPath = path.resolve(logPath);
        this.ensureLogDirectory();
    }

    // Ensure log directory exists
    ensureLogDirectory() {
        const dir = path.dirname(this.logPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    // Log an audit event
    log(event) {
        const auditEntry = this.createAuditEntry(event);
        
        try {
            fs.appendFileSync(this.logPath, JSON.stringify(auditEntry) + '\n', { 
                flag: 'a',
                mode: 0o600 // Secure file permissions
            });
        } catch (error) {
            console.error('Audit logging failed:', error);
        }
    }

    // Create a comprehensive audit entry
    createAuditEntry(event) {
        return {
            timestamp: new Date().toISOString(),
            id: this.generateUniqueId(),
            type: event.type,
            category: event.category || 'general',
            severity: event.severity || 'info',
            actor: this.sanitizeActor(event.actor),
            action: event.action,
            target: this.sanitizeTarget(event.target),
            metadata: this.sanitizeMetadata(event.metadata),
            ip: event.ip || 'unknown',
            success: event.success !== undefined ? event.success : true
        };
    }

    // Generate a unique, secure identifier
    generateUniqueId() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Sanitize actor information
    sanitizeActor(actor) {
        if (!actor) return 'unknown';
        
        // Remove sensitive information
        const sanitized = { ...actor };
        delete sanitized.password;
        delete sanitized.token;
        
        return {
            id: sanitized.id || 'unknown',
            type: sanitized.type || 'system',
            username: sanitized.username ? this.maskUsername(sanitized.username) : 'unknown'
        };
    }

    // Sanitize target information
    sanitizeTarget(target) {
        if (!target) return 'unknown';
        
        return {
            type: target.type || 'unknown',
            id: target.id || 'unknown',
            name: target.name ? this.maskSensitiveData(target.name) : 'unknown'
        };
    }

    // Sanitize metadata
    sanitizeMetadata(metadata) {
        if (!metadata) return {};
        
        const sanitized = { ...metadata };
        
        // List of keys to mask
        const sensitiveKeys = ['password', 'token', 'secret', 'key'];
        
        sensitiveKeys.forEach(key => {
            if (sanitized[key]) {
                sanitized[key] = this.maskSensitiveData(sanitized[key]);
            }
        });
        
        return sanitized;
    }

    // Mask sensitive usernames
    maskUsername(username) {
        if (username.length <= 2) return '***';
        return username[0] + '***' + username.slice(-1);
    }

    // Mask sensitive data
    maskSensitiveData(data) {
        if (typeof data !== 'string') return data;
        
        if (data.length <= 4) return '****';
        
        return data.slice(0, 2) + '****' + data.slice(-2);
    }

    // Search audit logs
    async searchLogs(filters = {}) {
        try {
            const logContents = fs.readFileSync(this.logPath, 'utf8');
            const logs = logContents.trim().split('\n').map(JSON.parse);

            return logs.filter(log => {
                return Object.entries(filters).every(([key, value]) => {
                    // Exact match filtering
                    return log[key] === value;
                });
            });
        } catch (error) {
            console.error('Log search failed:', error);
            return [];
        }
    }
}

export default new AuditLogger();