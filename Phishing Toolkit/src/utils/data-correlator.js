import fs from 'fs';
import path from 'path';
import Logger from './logger.js';

class DataCorrelator {
    constructor() {
        this.logger = new Logger();
        this.correlationCache = new Map();
    }

    // Correlate data across multiple sources
    correlateData(dataSources) {
        const correlationResults = {};

        try {
            // Process each data source
            for (const [sourceName, sourceData] of Object.entries(dataSources)) {
                this.processDataSource(sourceName, sourceData, correlationResults);
            }

            // Analyze correlations
            const finalCorrelations = this.analyzeCorrelations(correlationResults);

            this.logger.info('Data correlation completed', {
                sourceCount: Object.keys(dataSources).length,
                correlationCount: Object.keys(finalCorrelations).length
            });

            return finalCorrelations;
        } catch (error) {
            this.logger.error('Data correlation failed', {
                error: error.message
            });
            return {};
        }
    }

    // Process individual data source
    processDataSource(sourceName, sourceData, correlationResults) {
        // Normalize and process data
        const processedData = this.normalizeData(sourceData);

        // Create correlation keys
        const correlationKeys = this.generateCorrelationKeys(processedData);

        // Store correlation information
        correlationResults[sourceName] = {
            processedData,
            correlationKeys
        };
    }

    // Normalize data for correlation
    normalizeData(data) {
        if (Array.isArray(data)) {
            return data.map(this.normalizeDataItem);
        }
        return this.normalizeDataItem(data);
    }

    // Normalize individual data item
    normalizeDataItem(item) {
        if (typeof item !== 'object' || item === null) return item;

        const normalizedItem = {};
        for (const [key, value] of Object.entries(item)) {
            // Convert to lowercase, trim whitespace
            const normalizedKey = key.toLowerCase().trim();
            const normalizedValue = typeof value === 'string' 
                ? value.toLowerCase().trim() 
                : value;

            normalizedItem[normalizedKey] = normalizedValue;
        }
        return normalizedItem;
    }

    // Generate correlation keys
    generateCorrelationKeys(processedData) {
        const correlationKeys = new Set();

        // Create correlation keys based on common attributes
        const extractCorrelationKeys = (item) => {
            const keys = [];

            // Example correlation strategies
            if (item.email) keys.push(`email:${item.email}`);
            if (item.phone) keys.push(`phone:${item.phone}`);
            if (item.ip) keys.push(`ip:${item.ip}`);
            
            return keys;
        };

        // Handle both single item and array
        const dataItems = Array.isArray(processedData) 
            ? processedData 
            : [processedData];

        dataItems.forEach(item => {
            const itemKeys = extractCorrelationKeys(item);
            itemKeys.forEach(key => correlationKeys.add(key));
        });

        return Array.from(correlationKeys);
    }

    // Analyze correlations between data sources
    analyzeCorrelations(correlationResults) {
        const finalCorrelations = {};

        // Compare correlation keys across sources
        const sourceNames = Object.keys(correlationResults);
        
        for (let i = 0; i < sourceNames.length; i++) {
            for (let j = i + 1; j < sourceNames.length; j++) {
                const source1 = sourceNames[i];
                const source2 = sourceNames[j];

                const commonKeys = this.findCommonCorrelationKeys(
                    correlationResults[source1].correlationKeys,
                    correlationResults[source2].correlationKeys
                );

                if (commonKeys.length > 0) {
                    finalCorrelations[`${source1}_${source2}`] = {
                        commonKeys,
                        sourceCount: 2
                    };
                }
            }
        }

        return finalCorrelations;
    }

    // Find common correlation keys
    findCommonCorrelationKeys(keys1, keys2) {
        return keys1.filter(key => keys2.includes(key));
    }

    // Save correlation results
    saveCorrelationResults(correlations, outputPath) {
        try {
            const outputDir = path.dirname(outputPath);
            
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write correlation results
            fs.writeFileSync(
                outputPath, 
                JSON.stringify(correlations, null, 2)
            );

            this.logger.info('Correlation results saved', { 
                path: outputPath 
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to save correlation results', {
                error: error.message
            });
            return false;
        }
    }
}

export default new DataCorrelator();