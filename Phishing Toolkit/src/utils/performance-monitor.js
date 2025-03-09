import os from 'os';
import v8 from 'v8';
import Logger from './logger.js';

class PerformanceMonitor {
    constructor() {
        this.logger = new Logger();
        this.startTime = process.hrtime();
    }

    // Get system resource usage
    getResourceUsage() {
        return {
            cpus: os.cpus(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };
    }

    // Get Node.js process memory usage
    getMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        const v8HeapStats = v8.getHeapStatistics();

        return {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            v8Total: v8HeapStats.total_heap_size,
            v8Used: v8HeapStats.used_heap_size
        };
    }

    // Calculate performance metrics
    getPerformanceMetrics() {
        const currentTime = process.hrtime(this.startTime);
        const uptime = currentTime[0] + currentTime[1] / 1e9;

        return {
            uptime: uptime,
            resourceUsage: this.getResourceUsage(),
            memoryUsage: this.getMemoryUsage()
        };
    }

    // Log performance warning if resources are constrained
    checkPerformanceThresholds() {
        const metrics = this.getPerformanceMetrics();
        const memoryUsage = metrics.memoryUsage;

        // Check memory usage
        const memoryThresholdPercent = 80;
        const usedMemoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

        if (usedMemoryPercent > memoryThresholdPercent) {
            this.logger.warn('High memory usage detected', {
                usedMemoryPercent: usedMemoryPercent.toFixed(2),
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal
            });
        }

        // Check load average
        const loadAverage = metrics.resourceUsage.loadAverage[0];
        if (loadAverage > os.cpus().length) {
            this.logger.warn('High system load detected', {
                loadAverage: loadAverage,
                cpuCount: os.cpus().length
            });
        }
    }

    // Start periodic performance monitoring
    startMonitoring(intervalMs = 60000) {
        this.monitorInterval = setInterval(() => {
            this.checkPerformanceThresholds();
        }, intervalMs);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
    }
}

export default PerformanceMonitor;