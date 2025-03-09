import os from 'os';
import crypto from 'crypto';
import { networkInterfaces } from 'os';

class NetworkFingerprint {
    // Generate a unique device fingerprint
    generateDeviceFingerprint() {
        const components = [
            this.getCPUFingerprint(),
            this.getNetworkInterfacesFingerprint(),
            this.getSystemInfo()
        ];

        return this.hashFingerprint(components.join('|'));
    }

    // Collect CPU information for fingerprinting
    getCPUFingerprint() {
        const cpus = os.cpus();
        return cpus.map(cpu => `${cpu.model}:${cpu.speed}`).join(',');
    }

    // Collect network interface information
    getNetworkInterfacesFingerprint() {
        const interfaces = networkInterfaces();
        const networkInfo = [];

        for (const [name, details] of Object.entries(interfaces)) {
            details.forEach(detail => {
                if (!detail.internal) {
                    networkInfo.push(`${name}:${detail.mac}:${detail.address}`);
                }
            });
        }

        return networkInfo.sort().join(',');
    }

    // Collect system information
    getSystemInfo() {
        return [
            os.platform(),
            os.release(),
            os.arch(),
            os.hostname()
        ].join(':');
    }

    // Hash the fingerprint components
    hashFingerprint(fingerprint) {
        return crypto
            .createHash('sha256')
            .update(fingerprint)
            .digest('hex');
    }

    // Analyze network environment
    analyzeNetworkEnvironment() {
        const interfaces = networkInterfaces();
        const analysis = {
            total_interfaces: 0,
            network_types: new Set(),
            ip_versions: new Set(),
            mac_addresses: []
        };

        for (const [name, details] of Object.entries(interfaces)) {
            details.forEach(detail => {
                if (!detail.internal) {
                    analysis.total_interfaces++;
                    analysis.network_types.add(name);
                    analysis.ip_versions.add(detail.family);
                    analysis.mac_addresses.push(detail.mac);
                }
            });
        }

        return analysis;
    }

    // Detect potential network spoofing
    detectNetworkSpoofing() {
        const interfaces = networkInterfaces();
        const spoofingIndicators = [];

        for (const [name, details] of Object.entries(interfaces)) {
            const macAddresses = details
                .filter(detail => !detail.internal)
                .map(detail => detail.mac);

            // Check for duplicate MAC addresses
            const uniqueMacs = new Set(macAddresses);
            if (uniqueMacs.size < macAddresses.length) {
                spoofingIndicators.push({
                    interface: name,
                    potential_spoofing: true
                });
            }
        }

        return spoofingIndicators;
    }

    // Generate network signature
    generateNetworkSignature() {
        const fingerprint = this.generateDeviceFingerprint();
        const environment = this.analyzeNetworkEnvironment();

        return {
            fingerprint,
            environment,
            timestamp: new Date().toISOString()
        };
    }
}

export default new NetworkFingerprint();