import ipaddr from 'ipaddr.js';
import { Config } from './config-manager.js';
import Logger from './logger.js';

class NetworkUtils {
    constructor() {
        this.config = new Config();
        this.logger = new Logger();
        this.rateLimit = new Map();
    }

    // Check if request is allowed
    isAllowedRequest(req) {
        const clientIP = this.getClientIP(req);
        
        // Check against trusted IPs
        const trustedIPs = this.config.get('security.trusted_ips', ['127.0.0.1']);
        const isAllowed = trustedIPs.some(trustedIP => 
            this.ipMatchesRange(clientIP, trustedIP)
        );

        // Rate limiting
        if (isAllowed && !this.checkRateLimit(clientIP)) {
            this.logger.warn('Rate limit exceeded', { ip: clientIP });
            return false;
        }

        return isAllowed;
    }

    // Get client IP address
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress;
    }

    // Check if IP matches a range or specific IP
    ipMatchesRange(ip, range) {
        try {
            const parsedIP = ipaddr.parse(ip);
            const parsedRange = ipaddr.parseCIDR(range);
            return parsedIP.match(parsedRange);
        } catch (error) {
            // Exact match if range parsing fails
            return ip === range;
        }
    }

    // Anonymize request headers
    anonymizeRequest(req) {
        // Remove identifying headers
        const headersToRemove = [
            'x-forwarded-for',
            'x-real-ip',
            'client-ip',
            'via',
            'forwarded'
        ];

        headersToRemove.forEach(header => {
            delete req.headers[header];
        });

        // Set generic user agent
        req.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    // Rate limiting mechanism
    checkRateLimit(ip) {
        const now = Date.now();
        const windowMs = this.config.get('security.rate_limit.window_ms', 900000);
        const maxRequests = this.config.get('security.rate_limit.max_requests', 100);

        // Clean up old entries
        this.cleanupRateLimit(now);

        // Get or create IP entry
        const ipEntry = this.rateLimit.get(ip) || { 
            requests: [], 
            blocked: false 
        };

        // Check if already blocked
        if (ipEntry.blocked) {
            return false;
        }

        // Filter requests within current window
        ipEntry.requests = ipEntry.requests.filter(
            timestamp => timestamp > now - windowMs
        );

        // Check if exceeds max requests
        if (ipEntry.requests.length >= maxRequests) {
            ipEntry.blocked = true;
            this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
            return false;
        }

        // Add current request
        ipEntry.requests.push(now);
        this.rateLimit.set(ip, ipEntry);

        return true;
    }

    // Clean up old rate limit entries
    cleanupRateLimit(currentTime) {
        for (const [ip, entry] of this.rateLimit.entries()) {
            // Remove entries older than 1 hour
            if (entry.requests.length === 0 || 
                (entry.blocked && currentTime - entry.requests[0] > 3600000)) {
                this.rateLimit.delete(ip);
            }
        }
    }
}

export default NetworkUtils;