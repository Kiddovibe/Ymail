import fs from 'fs';
import path from 'path';
import { Config } from '../utils/config-manager.js';
import Logger from '../utils/logger.js';

class ProxyManager {
    constructor() {
        this.config = new Config();
        this.logger = new Logger();
        this.proxyConfigPath = path.resolve('./config/proxy-config.json');
    }

    // Get current proxy link
    getCurrentLink() {
        const currentConfig = this.readProxyConfig();
        const port = currentConfig.port || 8080;
        return `https://localhost:${port}`;
    }

    // Change target domain
    async changeDomain(newDomain) {
        try {
            // Validate domain
            if (!this.isValidDomain(newDomain)) {
                throw new Error('Invalid domain format');
            }

            // Update configuration
            const currentConfig = this.readProxyConfig();
            currentConfig.current_domain = newDomain;
            
            // Write updated config
            this.writeProxyConfig(currentConfig);

            // Log the change
            this.logger.info(`Proxy domain changed to ${newDomain}`);

            return true;
        } catch (error) {
            this.logger.error('Domain change failed', { error: error.message });
            throw error;
        }
    }

    // Get proxy status
    async getStatus() {
        const currentConfig = this.readProxyConfig();
        
        return {
            domain: currentConfig.current_domain,
            server: currentConfig.server || 'localhost',
            uptime: this.getUptime(),
            port: currentConfig.port
        };
    }

    // Helper: Read proxy configuration
    readProxyConfig() {
        try {
            const configContent = fs.readFileSync(this.proxyConfigPath, 'utf8');
            return JSON.parse(configContent);
        } catch (error) {
            this.logger.error('Failed to read proxy configuration', { error: error.message });
            return {
                current_domain: 'login.yahoo.com',
                port: 8080,
                server: 'localhost'
            };
        }
    }

    // Helper: Write proxy configuration
    writeProxyConfig(config) {
        try {
            fs.writeFileSync(this.proxyConfigPath, JSON.stringify(config, null, 2));
        } catch (error) {
            this.logger.error('Failed to write proxy configuration', { error: error.message });
            throw error;
        }
    }

    // Domain validation
    isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }

    // Get system uptime
    getUptime() {
        const uptime = process.uptime();
        const days = Math.floor(uptime / (24 * 3600));
        const hours = Math.floor((uptime % (24 * 3600)) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        return `${days}d ${hours}h ${minutes}m`;
    }
}

export default ProxyManager;