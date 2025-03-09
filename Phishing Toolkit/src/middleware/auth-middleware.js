import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthMiddleware {
    constructor() {
        // Secret key for JWT (store securely, preferably in environment variables)
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
    }

    // Hardcoded admin credentials (replace with secure storage)
    async login(req, res) {
        const { username, password } = req.body;

        // Hardcoded admin credentials (REPLACE IN PRODUCTION)
        const ADMIN_USERNAME = 'admin';
        const ADMIN_PASSWORD = 'adminpass123'; // Use strong, hashed password in production

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Generate JWT token
            const token = jwt.sign(
                { username: ADMIN_USERNAME }, 
                this.JWT_SECRET, 
                { expiresIn: '2h' }
            );

            res.json({ 
                token, 
                message: 'Login successful' 
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }

    // Logout (invalidate token)
    async logout(req, res) {
        // In a real-world scenario, implement token blacklisting
        res.json({ message: 'Logged out successfully' });
    }

    // Middleware to require authentication
    requireAuth(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ message: 'Invalid or expired token' });
        }
    }
}

export default AuthMiddleware;