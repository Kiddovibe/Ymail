import url from 'url';
import Logger from '../utils/logger.js';
import CryptoUtils from '../utils/crypto-utils.js';
import NetworkUtils from '../utils/network-utils.js';

class RequestInterceptor {
    constructor() {
        this.logger = new Logger();
        this.cryptoUtils = new CryptoUtils();
        this.networkUtils = new NetworkUtils();
    }

    // Intercept and analyze incoming requests
    async intercept(req, res, next) {
        try {
            // Parse request URL
            const parsedUrl = url.parse(req.url, true);

            // Log request details (sanitized)
            this.logRequestDetails(req, parsedUrl);

            // Perform security checks
            if (!this.performSecurityChecks(req, parsedUrl)) {
                return res.status(403).json({ error: 'Request blocked' });
            }

            // Modify request if needed
            this.modifyRequest(req, parsedUrl);

            next();
        } catch (error) {
            this.logger.error('Request interception error', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Log request details with sensitive information masked
    logRequestDetails(req, parsedUrl) {
        const sanitizedUrl = this.sanitizeUrl(parsedUrl);
        
        this.logger.info('Incoming request', {
            method: req.method,
            path: sanitizedUrl,
            ip: this.maskIP(req.ip)
        });
    }

    // Sanitize URL to remove sensitive parameters
    sanitizeUrl(parsedUrl) {
        const sanitizedQuery = { ...parsedUrl.query };
        
        // Remove sensitive query parameters
        const sensitiveParams = ['password', 'token', 'key'];
        sensitiveParams.forEach(param => {
            if (sanitizedQuery[param]) {
                sanitizedQuery[param] = '[REDACTED]';
            }
        });

        return url.format({
            pathname: parsedUrl.pathname,
            query: sanitizedQuery
        });
    }

    // Mask IP address for logging
    maskIP(ip) {
        if (!ip) return '[UNKNOWN]';
        
        // For IPv4
        if (ip.includes('.')) {
            const parts = ip.split('.');
            return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }
        
        // For IPv6
        return ip.split(':').slice(0, 4).join(':') + ':xxxx:xxxx';
    }

    // Perform comprehensive security checks
    performSecurityChecks(req, parsedUrl) {
        // Check against known malicious patterns
        if (this.detectMaliciousPatterns(req, parsedUrl)) {
            this.logger.warn('Potential malicious request detected', {
                url: req.url,
                ip: req.ip
            });
            return false;
        }

        // Rate limiting
        if (!this.networkUtils.checkRateLimit(req.ip)) {
            this.logger.warn('Rate limit exceeded', {
                ip: req.ip
            });
            return false;
        }

        return true;
    }

    // Detect potentially malicious request patterns
    detectMaliciousPatterns(req, parsedUrl) {
        const maliciousPatterns = [
            // SQL Injection patterns
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i,
            
            // XSS patterns
            /(<script>|javascript:)/i,
            
            // Path traversal
            /(\.\.|%2e%2e)/,
            
            // Potential remote code execution
            /(\$\{|\{system\(|\$\()/
        ];

        // Check URL
        const fullUrl = req.url.toLowerCase();
        for (const pattern of maliciousPatterns) {
            if (pattern.test(fullUrl)) {
                return true;
            }
        }

        // Check headers
        const headers = JSON.stringify(req.headers).toLowerCase();
        for (const pattern of maliciousPatterns) {
            if (pattern.test(headers)) {
                return true;
            }
        }

        return false;
    }

    // Modify request to enhance security
    modifyRequest(req, parsedUrl) {
        // Remove or modify potentially sensitive headers
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

        // Add anonymity headers
        req.headers['x-proxy-type'] = 'research-toolkit';
    }
}

export default new RequestInterceptor();