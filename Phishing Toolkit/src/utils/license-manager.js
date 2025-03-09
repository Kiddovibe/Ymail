import Cryptlex from 'cryptlex-sdk';
import Logger from './logger.js';

class LicenseManager {
    constructor() {
        this.logger = new Logger();
        
        // Initialize Cryptlex with your account details
        this.cryptlex = new Cryptlex.Client({
            accountId: process.env.CRYPTLEX_ACCOUNT_ID,
            productId: process.env.CRYPTLEX_PRODUCT_ID,
            apiKey: process.env.CRYPTLEX_API_KEY
        });
    }

    // New method to validate a specific license key
    async validateLicenseKey(licenseKey) {
        try {
            // Validate the specific license key
            const license = await this.cryptlex.validateLicense(licenseKey);

            if (!license || !license.isValid) {
                this.logger.error('Invalid or expired license key');
                return false;
            }

            // Check additional license conditions
            if (license.isSuspended) {
                this.logger.error('License has been suspended');
                return false;
            }

            // Log successful license validation
            this.logLicenseInfo(license);

            return true;
        } catch (error) {
            this.logger.error('License key validation failed', {
                error: error.message
            });
            return false;
        }
    }

    // Existing methods remain the same...
}

export default new LicenseManager();