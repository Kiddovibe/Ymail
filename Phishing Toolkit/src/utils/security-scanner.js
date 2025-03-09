import crypto from 'crypto';
import https from 'https';
import tls from 'tls';
import Logger from './logger.js';

class SecurityScanner {
    constructor() {
        this.logger = new Logger();
    }

    // Perform SSL/TLS certificate analysis
    async analyzeCertificate(hostname) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: hostname,
                port: 443,
                method: 'GET',
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                const certificate = res.socket.getPeerCertificate();
                
                resolve({
                    subject: certificate.subject,
                    issuer: certificate.issuer,
                    valid_from: certificate.valid_from,
                    valid_to: certificate.valid_to,
                    fingerprint: this.calculateCertificateFingerprint(certificate)
                });
            });

            req.on('error', (error) => {
                this.logger.error('Certificate analysis failed', { 
                    hostname, 
                    error: error.message 
                });
                reject(error);
            });

            req.end();
        });
    }

    // Calculate certificate fingerprint
    calculateCertificateFingerprint(certificate) {
        try {
            const cert = certificate.raw.toString('base64');
            return crypto.createHash('sha256').update(cert).digest('hex');
        } catch (error) {
            this.logger.error('Fingerprint calculation failed', { error: error.message });
            return null;
        }
    }

    // Scan for known vulnerabilities
    async scanVulnerabilities(target) {
        const vulnerabilityChecks = [
            this.checkSSLProtocols(target),
            this.checkCipherSuites(target)
        ];

        try {
            const results = await Promise.all(vulnerabilityChecks);
            return {
                ssl_protocols: results[0],
                cipher_suites: results[1]
            };
        } catch (error) {
            this.logger.error('Vulnerability scan failed', { 
                target, 
                error: error.message 
            });
            return null;
        }
    }

    // Check supported SSL/TLS protocols
    checkSSLProtocols(hostname) {
        return new Promise((resolve, reject) => {
            const protocols = [
                'TLSv1.2',
                'TLSv1.3'
            ];

            const supportedProtocols = protocols.filter(protocol => {
                try {
                    const socket = tls.connect({
                        host: hostname,
                        port: 443,
                        secureProtocol: protocol
                    });
                    socket.destroy();
                    return true;
                } catch {
                    return false;
                }
            });

            resolve(supportedProtocols);
        });
    }

    // Check supported cipher suites
    checkCipherSuites(hostname) {
        return new Promise((resolve, reject) => {
            const cipherSuites = [
                'AES256-GCM-SHA384',
                'AES128-GCM-SHA256'
            ];

            const securedCiphers = cipherSuites.filter(cipher => {
                try {
                    const socket = tls.connect({
                        host: hostname,
                        port: 443,
                        ciphers: cipher
                    });
                    socket.destroy();
                    return true;
                } catch {
                    return false;
                }
            });

            resolve(securedCiphers);
        });
    }

    // Generate security report
    async generateSecurityReport(target) {
        try {
            const certificateAnalysis = await this.analyzeCertificate(target);
            const vulnerabilityScan = await this.scanVulnerabilities(target);

            return {
                target: target,
                certificate: certificateAnalysis,
                vulnerabilities: vulnerabilityScan,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Security report generation failed', { 
                target, 
                error: error.message 
            });
            return null;
        }
    }
}

export default new SecurityScanner();