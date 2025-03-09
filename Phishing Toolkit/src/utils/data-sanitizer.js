import validator from 'validator';

class DataSanitizer {
    // Sanitize and validate email
    sanitizeEmail(email) {
        if (!email) return null;

        // Normalize and validate email
        const normalizedEmail = validator.normalizeEmail(email, {
            gmail_remove_dots: false,
            gmail_remove_subaddress: false
        });

        return validator.isEmail(normalizedEmail) ? normalizedEmail : null;
    }

    // Sanitize phone number
    sanitizePhoneNumber(phone) {
        if (!phone) return null;

        // Remove non-digit characters
        const cleanedPhone = phone.replace(/\D/g, '');

        // Validate phone number length and format
        return cleanedPhone.length >= 10 && cleanedPhone.length <= 15 
            ? cleanedPhone 
            : null;
    }

    // Sanitize and validate URL
    sanitizeURL(url) {
        if (!url) return null;

        try {
            // Validate and normalize URL
            const normalizedURL = validator.normalizeURL(url, {
                stripFragment: true,
                stripWWW: true
            });

            return validator.isURL(normalizedURL) ? normalizedURL : null;
        } catch {
            return null;
        }
    }

    // Remove or escape HTML
    sanitizeHTML(input) {
        if (!input) return '';
        return validator.escape(input);
    }

    // Sanitize and validate IP address
    sanitizeIPAddress(ip) {
        if (!ip) return null;

        return validator.isIP(ip) ? ip : null;
    }

    // Clean and validate text input
    sanitizeText(input, options = {}) {
        if (!input) return '';

        const {
            maxLength = 500,
            allowSpecialChars = false,
            trim = true
        } = options;

        // Trim whitespace
        let cleanedInput = trim ? input.trim() : input;

        // Remove special characters if not allowed
        if (!allowSpecialChars) {
            cleanedInput = cleanedInput.replace(/[^\w\s]/gi, '');
        }

        // Truncate to max length
        return cleanedInput.substring(0, maxLength);
    }

    // Sanitize complex object
    sanitizeObject(obj, sanitizationRules = {}) {
        if (!obj || typeof obj !== 'object') return obj;

        const sanitizedObj = {};

        for (const [key, value] of Object.entries(obj)) {
            // Apply specific sanitization rules
            switch (sanitizationRules[key]) {
                case 'email':
                    sanitizedObj[key] = this.sanitizeEmail(value);
                    break;
                case 'phone':
                    sanitizedObj[key] = this.sanitizePhoneNumber(value);
                    break;
                case 'url':
                    sanitizedObj[key] = this.sanitizeURL(value);
                    break;
                case 'html':
                    sanitizedObj[key] = this.sanitizeHTML(value);
                    break;
                case 'ip':
                    sanitizedObj[key] = this.sanitizeIPAddress(value);
                    break;
                default:
                    // Default to text sanitization
                    sanitizedObj[key] = this.sanitizeText(value);
            }
        }

        return sanitizedObj;
    }
}

export default new DataSanitizer();