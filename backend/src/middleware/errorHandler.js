/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error response. Deliberate 4xx errors carry client-authored
    // messages and pass through; anything else (crashes, driver/DB errors)
    // must NOT echo err.message outward — schema/driver internals are free
    // reconnaissance for an attacker. The full error is logged above.
    const statusCode = err.statusCode || 500;
    const message = statusCode >= 500
        ? 'Internal Server Error'
        : (err.message || 'Internal Server Error');

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`
        }
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};