import Logger from '../utils/logger.js';
import CryptoUtils from '../utils/crypto-utils.js';

class PostResponseMiddleware {
    constructor() {
        this.logger = new Logger();
        this.cryptoUtils = new CryptoUtils();
    }

    // Primary post-response processing middleware
    async processResponse(req, res, responseBody) {
        try {
            // Analyze response content
            this.analyzeResponseContent(responseBody);

            // Modify response headers
            this.modifyResponseHeaders(res);

            // Log response metadata
            this.logResponseMetadata(req, responseBody);

            return responseBody;
        } catch (error) {
            this.logger.error('Post-response middleware error', { 
                error: error.message,
                stack: error.stack
            });
            return responseBody;
        }
    }

    // Analyze response for sensitive information
    analyzeResponseContent(responseBody) {
        const sensitivePatterns = [
            /password/i,
            /credentials/i,
            /token/i,
            /secret/i
        ];

        sensitivePatterns.forEach(pattern => {
            if (pattern.test(responseBody)) {
                this.logger.warn('Potential sensitive content detected', {
                    pattern: pattern.toString()
                });
            }
        });
    }

    // Modify response headers
    modifyResponseHeaders(res) {
        // Remove identifying headers
        const headersToRemove = [
            'server',
            'x-powered-by',
            'strict-transport-security'
        ];

        headersToRemove.forEach(header => {
            res.removeHeader(header);
        });

        // Add custom headers
        res.setHeader('X-Proxy-Type', 'Anonymous');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // Log response metadata
    logResponseMetadata(req, responseBody) {
        this.logger.info('Response processed', {
            url: req.url,
            method: req.method,
            responseLength: responseBody.length,
            timestamp: new Date().toISOString()
        });
    }
}

export default new PostResponseMiddleware();