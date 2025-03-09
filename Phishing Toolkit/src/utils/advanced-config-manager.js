import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Logger from './logger.js';

class AdvancedConfigManager {
    constructor() {
        this.logger = new Logger();
        this.configDir = path.resolve('./config');
        this.configCache = new Map();
        this.configWatchers = new Map();
    }

    // Load configuration with caching and validation
    loadConfig(configName, defaultConfig = {}) {
        const configPath = path.join(this.configDir, `${configName}.json`);

        try {
            // Check cache first
            if (this.configCache.has(configName)) {
                return this.configCache.get(configName);
            }

            // Read and parse config
            const rawConfig = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(rawConfig);

            // Validate configuration
            this.validateConfig(config);

            // Cache the configuration
            this.configCache.set(configName, config);

            // Set up file watcher
            this.watchConfigFile(configName, configPath);

            return config;
        } catch (error) {
            this.logger.warn(`Failed to load ${configName} config`, {
                error: error.message,
                usingDefault: true
            });

            // Return default if loading fails
            return defaultConfig;
        }
    }

    // Save configuration with encryption
    saveConfig(configName, config) {
        const configPath = path.join(this.configDir, `${configName}.json`);

        try {
            // Validate before saving
            this.validateConfig(config);

            // Convert to JSON with pretty printing
            const configJson = JSON.stringify(config, null, 2);

            // Optional: Encrypt sensitive sections
            const encryptedConfig = this.encryptSensitiveData(configJson);

            // Write file
            fs.writeFileSync(configPath, encryptedConfig, { mode: 0o600 });

            // Update cache
            this.configCache.set(configName, config);

            this.logger.info(`Configuration ${configName} saved successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save ${configName} config`, {
                error: error.message
            });
            return false;
        }
    }

    // Validate configuration structure
    validateConfig(config) {
        // Example validation rules
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration format');
        }

        // Add specific validation rules as needed
        const requiredFields = [
            'proxy.target_domain',
            'telegram.bot_token'
        ];

        requiredFields.forEach(field => {
            const value = this.getNestedValue(config, field.split('.'));
            if (value === undefined) {
                throw new Error(`Missing required config field: ${field}`);
            }
        });
    }

    // Encrypt sensitive configuration data
    encryptSensitiveData(configJson) {
        const sensitiveFields = [
            'bot_token',
            'password',
            'secret_key'
        ];

        // Simple encryption mechanism
        const encryptionKey = this.generateEncryptionKey();
        
        let encryptedConfig = configJson;
        sensitiveFields.forEach(field => {
            encryptedConfig = encryptedConfig.replace(
                new RegExp(`("${field}":\\s*)"([^"]*)"`, 'g'),
                (match, prefix, value) => {
                    const encrypted = this.encrypt(value, encryptionKey);
                    return `${prefix}"${encrypted}"`;
                }
            );
        });

        return encryptedConfig;
    }

    // Generate an encryption key
    generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    // Encrypt data
    encrypt(data, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    }

    // Watch configuration file for changes
    watchConfigFile(configName, configPath) {
        // Remove existing watcher if exists
        if (this.configWatchers.has(configName)) {
            this.configWatchers.get(configName).close();
        }

        // Create new watcher
        const watcher = fs.watch(configPath, (eventType) => {
            if (eventType === 'change') {
                this.logger.info(`Configuration ${configName} changed`);
                // Reload configuration
                this.configCache.delete(configName);
                this.loadConfig(configName);
            }
        });

        // Store watcher
        this.configWatchers.set(configName, watcher);
    }

    // Helper to get nested object value
    getNestedValue(obj, keys) {
        return keys.reduce((acc, key) => 
            (acc && acc[key] !== undefined) ? acc[key] : undefined, 
            obj
        );
    }
}

export default new AdvancedConfigManager();