/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error response
    const statusCode = err.statusCode || 500;
    // Unexpected crashes carry driver and schema wording nobody wrote for
    // clients. Only deliberate errors with an explicit status keep their
    // message; everything else gets a generic one. The log above keeps
    // the original for debugging.
    const message = err.statusCode
        ? (err.message || 'Internal Server Error')
        : 'Internal Server Error';

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