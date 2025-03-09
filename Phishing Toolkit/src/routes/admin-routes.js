import express from 'express';
import AuthMiddleware from '../middleware/auth-middleware.js';
import DashboardController from '../controllers/dashboard-controller.js';

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.dashboardController = new DashboardController();
    }

    initRoutes() {
        // Authentication routes
        this.router.post('/login', this.authMiddleware.login);
        this.router.post('/logout', this.authMiddleware.logout);

        // Dashboard data routes
        this.router.get('/dashboard-data', 
            this.authMiddleware.requireAuth, 
            this.dashboardController.getDashboardData
        );

        // Proxy configuration routes
        this.router.get('/proxy-config', 
            this.authMiddleware.requireAuth, 
            this.dashboardController.getProxyConfig
        );
        this.router.post('/proxy-config', 
            this.authMiddleware.requireAuth, 
            this.dashboardController.updateProxyConfig
        );

        // Capture logs route
        this.router.get('/capture-logs', 
            this.authMiddleware.requireAuth, 
            this.dashboardController.getCaptureLogs
        );

        // License management routes
        this.router.get('/license-info', 
            this.authMiddleware.requireAuth, 
            this.dashboardController.getLicenseInfo
        );

        return this.router;
    }
}

export default new AdminRoutes();