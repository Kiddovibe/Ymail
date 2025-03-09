import crypto from 'crypto';

class AnonymizationUtility {
    // Hash sensitive data with optional salt
    hashData(data, salt = '') {
        if (!data) return null;
        
        const hash = crypto.createHash('sha256');
        hash.update(data + salt);
        return hash.digest('hex');
    }

    // Mask email addresses
    maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        
        const [username, domain] = email.split('@');
        const maskedUsername = this.maskString(username);
        return `${maskedUsername}@${domain}`;
    }

    // Mask IP address
    maskIPAddress(ip) {
        if (!ip) return ip;
        
        // IPv4 masking
        if (ip.includes('.')) {
            const parts = ip.split('.');
            return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }
        
        // IPv6 masking
        return ip.split(':')
            .slice(0, 4)
            .join(':') + ':xxxx:xxxx';
    }

    // Mask phone number
    maskPhoneNumber(phone) {
        if (!phone) return phone;
        
        // Remove non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        if (digits.length < 6) return phone;
        
        // Keep first 2 and last 2 digits, mask the rest
        return digits.slice(0, 2) + 
               'x'.repeat(digits.length - 4) + 
               digits.slice(-2);
    }

    // Generic string masking
    maskString(str, visibleChars = 2) {
        if (!str) return str;
        
        if (str.length <= visibleChars * 2) {
            return '*'.repeat(str.length);
        }
        
        return str.slice(0, visibleChars) + 
               '*'.repeat(str.length - visibleChars * 2) + 
               str.slice(-visibleChars);
    }

    // Generate pseudonymous identifier
    generatePseudonym(originalData) {
        if (!originalData) return null;
        
        // Create a consistent pseudonym using hash
        const hash = crypto.createHash('sha512');
        hash.update(originalData);
        return hash.digest('hex').slice(0, 32);
    }

    // Tokenize sensitive data
    createTokenizedData(sensitiveData) {
        const token = this.generatePseudonym(sensitiveData);
        const hashedData = this.hashData(sensitiveData);
        
        return {
            token,
            hash: hashedData
        };
    }

    // Anonymize complex object
    anonymizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const anonymizedObj = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Apply different anonymization based on key
            switch (true) {
                case key.toLowerCase().includes('email'):
                    anonymizedObj[key] = this.maskEmail(value);
                    break;
                case key.toLowerCase().includes('phone'):
                    anonymizedObj[key] = this.maskPhoneNumber(value);
                    break;
                case key.toLowerCase().includes('ip'):
                    anonymizedObj[key] = this.maskIPAddress(value);
                    break;
                case ['password', 'token', 'secret'].some(sensitiveKey => 
                    key.toLowerCase().includes(sensitiveKey)
                ):
                    anonymizedObj[key] = this.hashData(value);
                    break;
                default:
                    anonymizedObj[key] = value;
            }
        }
        
        return anonymizedObj;
    }
}

export default new AnonymizationUtility();