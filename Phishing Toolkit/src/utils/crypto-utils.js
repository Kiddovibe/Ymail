import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class CryptoUtils {
    constructor() {
        // Load or generate encryption key
        this.encryptionKey = this.loadOrGenerateKey();
    }

    // Load existing key or generate new
    loadOrGenerateKey() {
        const keyPath = path.join(process.cwd(), '.secret-key');
        
        try {
            // Try to read existing key
            return fs.readFileSync(keyPath, 'utf8').trim();
        } catch (error) {
            // Generate new key if not exists
            const newKey = crypto.randomBytes(32).toString('hex');
            
            // Ensure directory exists
            const dir = path.dirname(keyPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write key with secure permissions
            fs.writeFileSync(keyPath, newKey, { mode: 0o600 });
            return newKey;
        }
    }

    // Encrypt data
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(
                'aes-256-cbc', 
                Buffer.from(this.encryptionKey, 'hex'), 
                iv
            );

            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            return `${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // Decrypt data
    decrypt(encryptedData) {
        try {
            const [ivHex, encryptedText] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');

            const decipher = crypto.createDecipheriv(
                'aes-256-cbc', 
                Buffer.from(this.encryptionKey, 'hex'), 
                iv
            );

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // Generate secure random token
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash password
    hashPassword(password, salt = null) {
        salt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }

    // Verify password
    verifyPassword(password, salt, originalHash) {
        const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return computedHash === originalHash;
    }
}

export default CryptoUtils;