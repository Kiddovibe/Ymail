import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Logger from './logger.js';

class ProxyConfigManager {
    constructor() {
        this.logger = new Logger();
        this.configPath = path.resolve('./config/proxy-routes.json');
        this.configCache = new Map();
    }

    // Load proxy routes configuration
    loadProxyRoutes() {
        try {
            // Check cache first
            if (this.configCache.has('routes')) {
                return this.configCache.get('routes');
            }

            // Read configuration file
            const rawConfig = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(rawConfig);

            // Validate and process routes
            const processedRoutes = this.processRoutes(config.routes || []);

            // Cache processed routes
            this.configCache.set('routes', processedRoutes);

            return processedRoutes;
        } catch (error) {
            this.logger.error('Failed to load proxy routes', { 
                error: error.message 
            });
            return [];
        }
    }

    // Process and validate routes
    processRoutes(routes) {
        return routes.map(route => {
            // Validate and sanitize route configuration
            return {
                id: this.generateRouteId(route),
                path: this.sanitizePath(route.path),
                target: this.sanitizeTarget(route.target),
                method: route.method ? route.method.toUpperCase() : 'ALL',
                active: route.active !== false,
                headers: this.processHeaders(route.headers)
            };
        }).filter(route => route.path && route.target);
    }

    // Generate unique route identifier
    generateRouteId(route) {
        const routeString = `${route.path}:${route.target}`;
        return crypto
            .createHash('md5')
            .update(routeString)
            .digest('hex')
            .slice(0, 8);
    }

    // Sanitize route path
    sanitizePath(path) {
        if (!path) return null;
        
        // Remove leading/trailing slashes, normalize
        return path.replace(/^\/+|\/+$/g, '');
    }

    // Sanitize target URL
    sanitizeTarget(target) {
        if (!target) return null;
        
        try {
            const parsedUrl = new URL(target);
            return parsedUrl.origin;
        } catch {
            return null;
        }
    }

    // Process and sanitize headers
    processHeaders(headers = {}) {
        const sanitizedHeaders = {};

        for (const [key, value] of Object.entries(headers)) {
            // Sanitize header key and value
            const sanitizedKey = key.toLowerCase().trim();
            const sanitizedValue = this.sanitizeHeaderValue(value);

            if (sanitizedKey && sanitizedValue) {
                sanitizedHeaders[sanitizedKey] = sanitizedValue;
            }
        }

        return sanitizedHeaders;
    }

    // Sanitize header value
    sanitizeHeaderValue(value) {
        if (!value) return null;
        
        // Remove potentially dangerous characters
        return String(value)
            .trim()
            .replace(/[\r\n]/g, '');
    }

    // Add new proxy route
    addProxyRoute(routeConfig) {
        try {
            // Load existing routes
            const routes = this.loadProxyRoutes();

            // Process and validate new route
            const newRoute = this.processRoutes([routeConfig])[0];

            if (!newRoute) {
                throw new Error('Invalid route configuration');
            }

            // Check for duplicate routes
            const existingRoute = routes.find(
                route => route.path === newRoute.path && 
                         route.target === newRoute.target
            );

            if (existingRoute) {
                throw new Error('Duplicate route configuration');
            }

            // Add new route
            routes.push(newRoute);

            // Save updated routes
            this.saveProxyRoutes(routes);

            return newRoute;
        } catch (error) {
            this.logger.error('Failed to add proxy route', { 
                error: error.message 
            });
            return null;
        }
    }

    // Save proxy routes
    saveProxyRoutes(routes) {
        try {
            const configToSave = {
                routes,
                last_updated: new Date().toISOString()
            };

            // Write to configuration file
            fs.writeFileSync(
                this.configPath, 
                JSON.stringify(configToSave, null, 2),
                { mode: 0o600 }
            );

            // Update cache
            this.configCache.set('routes', routes);

            this.logger.info('Proxy routes updated successfully');
        } catch (error) {
            this.logger.error('Failed to save proxy routes', { 
                error: error.message 
            });
        }
    }

    // Remove proxy route
    removeProxyRoute(routeId) {
        try {
            // Load existing routes
            const routes = this.loadProxyRoutes();

            // Filter out route with matching ID
            const updatedRoutes = routes.filter(route => route.id !== routeId);

            // Save updated routes
            this.saveProxyRoutes(updatedRoutes);

            return updatedRoutes;
        } catch (error) {
            this.logger.error('Failed to remove proxy route', { 
                routeId, 
                error: error.message 
            });
            return null;
        }
    }
}

export default new ProxyConfigManager();