import axios from 'axios';
import Logger from './logger.js';

class ThreatIntelligence {
    constructor() {
        this.logger = new Logger();
        this.apiEndpoints = [
            'https://api.abuseipdb.com/api/v2/check',
            'https://www.virustotal.com/api/v3/ip_addresses/',
            'https://otx.alienvault.com/api/v1/indicators/IPv4/'
        ];
        this.apiKeys = {
            abuseIPDB: process.env.ABUSEIPDB_API_KEY,
            virusTotal: process.env.VIRUSTOTAL_API_KEY,
            alienVault: process.env.ALIENVAULT_API_KEY
        };
    }

    // Check IP reputation across multiple threat intelligence sources
    async checkIPReputation(ip) {
        const checks = [
            this.checkAbuseIPDB(ip),
            this.checkVirusTotal(ip),
            this.checkAlienVault(ip)
        ];

        try {
            const results = await Promise.allSettled(checks);
            
            return {
                abuseIPDB: this.extractResult(results[0]),
                virusTotal: this.extractResult(results[1]),
                alienVault: this.extractResult(results[2])
            };
        } catch (error) {
            this.logger.error('IP reputation check failed', { 
                ip, 
                error: error.message 
            });
            return null;
        }
    }

    // Check IP against AbuseIPDB
    async checkAbuseIPDB(ip) {
        if (!this.apiKeys.abuseIPDB) return null;

        try {
            const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
                params: { ipAddress: ip, maxAgeInDays: 90 },
                headers: {
                    'Key': this.apiKeys.abuseIPDB,
                    'Accept': 'application/json'
                }
            });

            return {
                isPublic: response.data.data.isPublic,
                abuseConfidenceScore: response.data.data.abuseConfidenceScore,
                totalReports: response.data.data.totalReports
            };
        } catch (error) {
            this.logger.debug('AbuseIPDB check failed', { error: error.message });
            return null;
        }
    }

    // Check IP against VirusTotal
    async checkVirusTotal(ip) {
        if (!this.apiKeys.virusTotal) return null;

        try {
            const response = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
                headers: {
                    'x-apikey': this.apiKeys.virusTotal
                }
            });

            return {
                maliciousVotes: response.data.data.attributes.last_analysis_stats.malicious,
                totalVotes: Object.values(response.data.data.attributes.last_analysis_stats).reduce((a, b) => a + b, 0)
            };
        } catch (error) {
            this.logger.debug('VirusTotal check failed', { error: error.message });
            return null;
        }
    }

    // Check IP against AlienVault OTX
    async checkAlienVault(ip) {
        if (!this.apiKeys.alienVault) return null;

        try {
            const response = await axios.get(`https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`, {
                headers: {
                    'X-OTX-API-KEY': this.apiKeys.alienVault
                }
            });

            return {
                reputation: response.data.reputation,
                malwareCount: response.data.malware ? response.data.malware.length : 0
            };
        } catch (error) {
            this.logger.debug('AlienVault check failed', { error: error.message });
            return null;
        }
    }

    // Extract result from Promise.allSettled
    extractResult(settledResult) {
        return settledResult.status === 'fulfilled' 
            ? settledResult.value 
            : null;
    }

    // Aggregate threat intelligence
    async aggregateThreatIntelligence(ip) {
        const reputationCheck = await this.checkIPReputation(ip);
        
        // Determine overall threat level
        const threatLevel = this.calculateThreatLevel(reputationCheck);

        return {
            ip,
            reputationCheck,
            threatLevel
        };
    }

    // Calculate threat level based on reputation checks
    calculateThreatLevel(reputationCheck) {
        if (!reputationCheck) return 'unknown';

        const checks = [
            reputationCheck.abuseIPDB?.abuseConfidenceScore || 0,
            (reputationCheck.virusTotal?.maliciousVotes || 0) * 10,
            reputationCheck.alienVault?.malwareCount || 0
        ];

        const averageThreat = checks.reduce((a, b) => a + b, 0) / checks.length;

        if (averageThreat > 70) return 'high';
        if (averageThreat > 30) return 'medium';
        return 'low';
    }
}

export default new ThreatIntelligence();