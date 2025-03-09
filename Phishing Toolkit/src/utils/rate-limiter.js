import Logger from './logger.js';

class RateLimiter {
    constructor(options = {}) {
        this.logger = new Logger();
        this.limits = new Map();
        this.defaultOptions = {
            maxRequests: 100,
            windowMs: 15 * 60 * 1000, // 15 minutes
            blockDuration: 30 * 60 * 1000 // 30 minutes
        };
        this.options = { ...this.defaultOptions, ...options };
    }

    // Check if request is allowed
    checkRequest(identifier) {
        const now = Date.now();
        
        // Get or create entry for this identifier
        let entry = this.limits.get(identifier) || {
            requests: [],
            blockedUntil: 0
        };

        // Check if currently blocked
        if (entry.blockedUntil > now) {
            this.logger.warn('Request blocked due to rate limit', { 
                identifier,
                blockedUntil: new Date(entry.blockedUntil).toISOString()
            });
            return false;
        }

        // Remove expired requests
        entry.requests = entry.requests.filter(
            timestamp => timestamp > now - this.options.windowMs
        );

        // Check if max requests exceeded
        if (entry.requests.length >= this.options.maxRequests) {
            // Block the identifier
            entry.blockedUntil = now + this.options.blockDuration;
            this.limits.set(identifier, entry);

            this.logger.warn('Rate limit exceeded', { 
                identifier,
                blockUntil: new Date(entry.blockedUntil).toISOString()
            });

            return false;
        }

        // Add current request
        entry.requests.push(now);
        this.limits.set(identifier, entry);

        return true;
    }

    // Manually block an identifier
    blockIdentifier(identifier, duration = null) {
        const now = Date.now();
        const blockDuration = duration || this.options.blockDuration;

        this.limits.set(identifier, {
            requests: [],
            blockedUntil: now + blockDuration
        });

        this.logger.info('Manually blocked identifier', { 
            identifier,
            blockUntil: new Date(now + blockDuration).toISOString()
        });
    }

    // Get current status for an identifier
    getStatus(identifier) {
        const entry = this.limits.get(identifier);
        
        if (!entry) return null;

        return {
            requestCount: entry.requests.length,
            blockedUntil: entry.blockedUntil,
            isBlocked: entry.blockedUntil > Date.now()
        };
    }

    // Clear expired entries
    cleanup() {
        const now = Date.now();
        
        for (const [identifier, entry] of this.limits.entries()) {
            // Remove if no recent requests and not blocked
            if (entry.requests.length === 0 && entry.blockedUntil < now) {
                this.limits.delete(identifier);
            }
        }
    }

    // Start periodic cleanup
    startCleanup(interval = 60 * 60 * 1000) { // Hourly
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, interval);
    }

    // Stop cleanup
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

export default new RateLimiter();