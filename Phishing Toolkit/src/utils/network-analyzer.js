import pcap from 'pcap';
import Logger from './logger.js';

class NetworkTrafficAnalyzer {
    constructor() {
        this.logger = new Logger();
        this.captureSession = null;
        this.packetCount = 0;
        this.trafficLog = [];
    }

    // Start network packet capture
    startCapture(interfaceName = 'eth0', filter = '') {
        try {
            // Create capture session
            this.captureSession = pcap.createSession(interfaceName, filter);

            // Packet processing
            this.captureSession.on('packet', (rawPacket) => {
                this.processPacket(rawPacket);
            });

            this.logger.info('Network capture started', { 
                interface: interfaceName, 
                filter: filter || 'No specific filter' 
            });

            return true;
        } catch (error) {
            this.logger.error('Capture initialization failed', { 
                error: error.message 
            });
            return false;
        }
    }

    // Process individual network packet
    processPacket(rawPacket) {
        try {
            const packet = pcap.decode.packet(rawPacket);
            
            // Increment packet count
            this.packetCount++;

            // Analyze packet details
            const packetInfo = this.extractPacketInfo(packet);
            
            // Log packet if it meets certain criteria
            if (this.shouldLogPacket(packetInfo)) {
                this.trafficLog.push(packetInfo);
            }

            // Limit log size
            if (this.trafficLog.length > 1000) {
                this.trafficLog.shift();
            }
        } catch (error) {
            // Silently handle decoding errors
            this.logger.debug('Packet processing error', { 
                error: error.message 
            });
        }
    }

    // Extract relevant packet information
    extractPacketInfo(packet) {
        return {
            timestamp: new Date().toISOString(),
            protocol: packet.protocol,
            sourceIP: packet.ip.saddr,
            destinationIP: packet.ip.daddr,
            sourcePort: packet.tcp ? packet.tcp.sport : null,
            destinationPort: packet.tcp ? packet.tcp.dport : null,
            packetLength: packet.pcap_header.len
        };
    }

    // Determine if packet should be logged
    shouldLogPacket(packetInfo) {
        // Log packets to specific ports or protocols
        const interestingPorts = [80, 443, 8080];
        const interestingProtocols = ['TCP', 'HTTP', 'HTTPS'];

        return (
            interestingPorts.includes(packetInfo.destinationPort) ||
            interestingProtocols.includes(packetInfo.protocol)
        );
    }

    // Stop network capture
    stopCapture() {
        if (this.captureSession) {
            this.captureSession.close();
            
            this.logger.info('Network capture stopped', {
                totalPackets: this.packetCount
            });

            return this.getTrafficSummary();
        }
        return null;
    }

    // Generate traffic summary
    getTrafficSummary() {
        const uniqueSourceIPs = new Set(
            this.trafficLog.map(packet => packet.sourceIP)
        );

        const uniqueDestinationIPs = new Set(
            this.trafficLog.map(packet => packet.destinationIP)
        );

        return {
            totalPackets: this.packetCount,
            uniqueSourceIPs: uniqueSourceIPs.size,
            uniqueDestinationIPs: uniqueDestinationIPs.size,
            recentTraffic: this.trafficLog.slice(-10)
        };
    }

    // Advanced traffic pattern analysis
    analyzeTrafficPatterns() {
        const portUsage = {};
        const protocolUsage = {};

        // Analyze packet distribution
        this.trafficLog.forEach(packet => {
            // Count port usage
            portUsage[packet.destinationPort] = 
                (portUsage[packet.destinationPort] || 0) + 1;

            // Count protocol usage
            protocolUsage[packet.protocol] = 
                (protocolUsage[packet.protocol] || 0) + 1;
        });

        return {
            portUsage,
            protocolUsage
        };
    }
}

export default new NetworkTrafficAnalyzer();