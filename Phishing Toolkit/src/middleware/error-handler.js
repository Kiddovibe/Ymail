import Logger from '../utils/logger.js';

class ErrorHandler {
    constructor() {
        this.logger = new Logger();
    }

    // Global error handling middleware
    handleError(err, req, res, next) {
        // Log the error
        this.logger.error('Unhandled Error', {
            message: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method
        });

        // Determine error response
        const statusCode = err.status || 500;
        const errorResponse = {
            error: true,
            status: statusCode,
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message
        };

        // Send error response
        res.status(statusCode).json(errorResponse);
    }

    // Catch 404 routes
    handle404(req, res, next) {
        const error = new Error('Route Not Found');
        error.status = 404;
        next(error);
    }
}

export default new ErrorHandler();