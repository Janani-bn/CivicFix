/* global module */
const { removeUploadedFile } = require('./uploadMiddleware');

/**
 * Validate complaint creation data
 */
const validateComplaint = (req, res, next) => {
    const {
        name,
        phone,
        area,
        city,
        issueType,
        description
    } = req.body || {};

    const errors = [];

    // Required fields
    if (typeof name !== 'string' || name.trim() === '') {
        errors.push('Name is required');
    }

    if (typeof phone !== 'string' || phone.trim() === '') {
        errors.push('Phone is required');
    } else if (phone.replace(/\D/g, '').length < 10) {
        errors.push('Phone number must be at least 10 digits');
    }

    if (typeof area !== 'string' || area.trim() === '') {
        errors.push('Area is required');
    }

    if (typeof city !== 'string' || city.trim() === '') {
        errors.push('City is required');
    }

    if (typeof issueType !== 'string' || issueType.trim() === '') {
        errors.push('Issue type is required');
    }

    if (typeof description !== 'string' || description.trim() === '') {
        errors.push('Description is required');
    }

    if (errors.length > 0) {
        removeUploadedFile(req.file);
        req.file = undefined;

        return res.status(400).json({
            success: false,
            error: {
                message: 'Validation failed',
                details: errors
            }
        });
    }

    next();
};

/**
 * Validate status update
 */
const validateStatusUpdate = (req, res, next) => {
    const { status } = req.body || {};
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];

    if (!status || typeof status !== 'string' || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: {
                message: `Status must be one of: ${validStatuses.join(', ')}`
            }
        });
    }

    next();
};

/**
 * Validate department assignment
 */
const validateDepartmentAssignment = (req, res, next) => {
    const { department } = req.body || {};

    if (!department || typeof department !== 'string' || department.trim() === '') {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Department is required'
            }
        });
    }

    next();
};

module.exports = {
    validateComplaint,
    validateStatusUpdate,
    validateDepartmentAssignment
};
