import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class AdvancedEncryption {
    constructor() {
        this.keyStoragePath = path.resolve('./.encryption-keys');
        this.ensureKeyStorageDirectory();
    }

    // Ensure key storage directory exists
    ensureKeyStorageDirectory() {
        if (!fs.existsSync(this.keyStoragePath)) {
            fs.mkdirSync(this.keyStoragePath, { recursive: true, mode: 0o700 });
        }
    }

    // Generate a robust encryption key
    generateKey(keyType = 'aes-256', keyPurpose = 'default') {
        let key;
        switch(keyType) {
            case 'aes-256':
                key = crypto.randomBytes(32);
                break;
            case 'aes-192':
                key = crypto.randomBytes(24);
                break;
            case 'aes-128':
                key = crypto.randomBytes(16);
                break;
            default:
                throw new Error('Unsupported key type');
        }

        // Generate unique filename
        const filename = `${keyPurpose}-${Date.now()}.key`;
        const fullPath = path.join(this.keyStoragePath, filename);

        // Write key with secure permissions
        fs.writeFileSync(fullPath, key, { mode: 0o600 });

        return {
            key: key,
            path: fullPath
        };
    }

    // Advanced encryption with multiple layers
    encrypt(data, key = null) {
        try {
            // Use provided key or generate new
            const encryptionKey = key || this.generateKey().key;

            // Generate initialization vector
            const iv = crypto.randomBytes(16);

            // Create cipher
            const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

            // Encrypt data
            let encrypted = cipher.update(
                JSON.stringify(data), 
                'utf8', 
                'base64'
            );
            encrypted += cipher.final('base64');

            // Return encrypted payload with IV
            return {
                payload: encrypted,
                iv: iv.toString('base64')
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }

    // Advanced decryption with multiple checks
    decrypt(encryptedData, key) {
        try {
            // Validate input
            if (!encryptedData || !encryptedData.payload || !encryptedData.iv) {
                throw new Error('Invalid encrypted data');
            }

            // Prepare decryption components
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

            // Decrypt data
            let decrypted = decipher.update(
                encryptedData.payload, 
                'base64', 
                'utf8'
            );
            decrypted += decipher.final('utf8');

            // Parse decrypted data
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Create secure hash with salt
    createSecureHash(data, salt = null) {
        // Use provided salt or generate new
        const useSalt = salt || crypto.randomBytes(16).toString('hex');

        // Use PBKDF2 for key stretching
        const hash = crypto.pbkdf2Sync(
            data, 
            useSalt, 
            100000,  // iterations
            64,      // key length
            'sha512' // hash algorithm
        );

        return {
            hash: hash.toString('hex'),
            salt: useSalt
        };
    }

    // Verify secure hash
    verifySecureHash(data, originalHash, salt) {
        const newHash = this.createSecureHash(data, salt);
        return newHash.hash === originalHash;
    }

    // Secure random token generation
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
}

export default new AdvancedEncryption();