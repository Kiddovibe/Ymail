import NetworkUtils from '../src/utils/network-utils.js';
import Logger from '../src/utils/logger.js';

class PreRequestHooks {
    constructor() {
        this.networkUtils = new NetworkUtils();
        this.logger = new Logger();
    }

    // Primary pre-request processing hook
    async processRequest(req, res, next) {
        try {
            // Network security checks
            if (!this.networkUtils.isAllowedRequest(req)) {
                this.logger.warn('Blocked request', { 
                    ip: req.ip,
                    url: req.url
                });
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Request modification
            this.modifyRequest(req);

            next();
        } catch (error) {
            this.logger.error('Pre-request hook error', { 
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // Modify request headers and metadata
    modifyRequest(req) {
        // Remove potentially identifying headers
        const headersToRemove = [
            'x-forwarded-for',
            'x-real-ip',
            'client-ip',
            'referer',
            'origin'
        ];

        headersToRemove.forEach(header => {
            delete req.headers[header];
        });

        // Set generic user agent
        req.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }
}

export default new PreRequestHooks();