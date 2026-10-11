const express = require('express');
const cors = require('cors');
require('dotenv').config();

try {
    require('./src/config/jwt');
} catch (err) {
    console.error(`FATAL BOOT ERROR: ${err.message}`);
    process.exit(1);
}

// Import routes
const complaintRoutes = require('./src/routes/complaints');
const authRoutes = require('./src/routes/auth');
const commentRoutes = require('./src/routes/comments');
const aiRoutes = require('./src/routes/ai');
const path = require('path');
const volunteerRoutes = require('./src/routes/volunteers');

// Import middleware
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { AI_MAX_BODY_SIZE } = require('./src/utils/aiLimits');

// Ensure DB schema exists (idempotent)
const initDatabase = require('./src/config/initDatabase');

// Import controllers for direct mounting
const { assignComplaint } = require('./src/controllers/complaintController');
const { validateDepartmentAssignment } = require('./src/middleware/validateComplaint');
const { authenticate, requireAdmin } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Apply a smaller body-size limit specifically to AI endpoints
app.use('/api/ai', express.json({ limit: AI_MAX_BODY_SIZE }));

app.use('/api/ai', express.urlencoded({
    limit: AI_MAX_BODY_SIZE,
    extended: true
}));

app.use('/api/ai', aiRoutes);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', (req, res, next) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = path.extname(req.path).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        return res.status(404).end();
    }

    next();
}, express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'CivicFix API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
// 1. POST /complaints, GET /complaints, GET /complaints/:id, PUT /complaints/:id
app.use('/api/complaints', complaintRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Comments routes
app.use('/api/comments', commentRoutes);

// Volunteer routes
app.use('/api/volunteers', volunteerRoutes);


// 2. POST /assign - Assign complaint to department
// Mounted directly as per architecture spec
app.post(
    '/api/assign',
    authenticate,
    requireAdmin,
    validateDepartmentAssignment,
    assignComplaint
);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);


if (require.main === module) {
    // Start server only when this file is run directly.
    initDatabase()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`🚀 CivicFix API Server running on port ${PORT}`);
                console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
                console.log(`📝 API Base: http://localhost:${PORT}/api`);
            });
        })
        .catch((err) => {
            console.error('Failed to initialize database:', err);
            process.exit(1);
        });
}

module.exports = app;
