import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

class Config {
    constructor() {
        // Load environment variables
        dotenv.config();

        // Configuration paths
        this.defaultConfigPath = path.resolve('./config/default.json');
        this.proxyConfigPath = path.resolve('./config/proxy-config.json');
    }

    // Get configuration value
    get(key, defaultValue = null) {
        try {
            // Check environment variables first
            const envKey = key.toUpperCase().replace(/\./g, '_');
            const envValue = process.env[envKey];
            if (envValue) return envValue;

            // Split key into parts
            const keys = key.split('.');
            
            // Determine which config file to use
            const configPath = keys[0] === 'proxy' 
                ? this.proxyConfigPath 
                : this.defaultConfigPath;

            // Read configuration
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Navigate nested keys
            let value = config;
            for (const k of keys) {
                if (value && value[k] !== undefined) {
                    value = value[k];
                } else {
                    return defaultValue;
                }
            }

            return value;
        } catch (error) {
            console.error('Config retrieval error:', error);
            return defaultValue;
        }
    }

    // Set configuration value
    set(key, value) {
        try {
            const keys = key.split('.');
            const configPath = keys[0] === 'proxy' 
                ? this.proxyConfigPath 
                : this.defaultConfigPath;

            // Read existing config
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Navigate/create nested structure
            let current = config;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            // Set final value
            current[keys[keys.length - 1]] = value;

            // Write back to file
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            return true;
        } catch (error) {
            console.error('Config update error:', error);
            return false;
        }
    }
}

export default Config;