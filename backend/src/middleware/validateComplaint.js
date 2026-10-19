/* global module */
const { removeUploadedFile } = require('./uploadMiddleware');
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);

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

    // Missing severity keeps the model's existing default of "medium".
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'severity')) {
        if (typeof req.body.severity !== 'string') {
            errors.push('Severity must be one of: low, medium, high');
        } else {
            const normalizedSeverity = req.body.severity.trim().toLowerCase();
            if (!VALID_SEVERITIES.has(normalizedSeverity)) {
                errors.push('Severity must be one of: low, medium, high');
            } else {
                req.body.severity = normalizedSeverity;
            }
        }
    }

    // Required fields
    if (typeof name !== 'string' || name.trim() === '') {
        errors.push('Name is required');
    } else if (name.length > 200) {
        errors.push('Name must not exceed 200 characters');
    }

    if (typeof phone !== 'string' || phone.trim() === '') {
        errors.push('Phone is required');
    } else if (!/^[\d\s\-+()]+$/.test(phone)) {
        errors.push('Phone number contains invalid characters');
    } else if ((phone.match(/\d/g) || []).length < 10) {
        errors.push('Phone number must contain at least 10 digits');
    }

    if (typeof area !== 'string' || area.trim() === '') {
        errors.push('Area is required');
    } else if (area.length > 200) {
        errors.push('Area must not exceed 200 characters');
    }

    if (typeof city !== 'string' || city.trim() === '') {
        errors.push('City is required');
    } else if (city.length > 200) {
        errors.push('City must not exceed 200 characters');
    }

    if (typeof issueType !== 'string' || issueType.trim() === '') {
        errors.push('Issue type is required');
    } else if (issueType.length > 200) {
        errors.push('Issue type must not exceed 200 characters');
    }

    if (typeof description !== 'string' || description.trim() === '') {
        errors.push('Description is required');
    } else if (description.length > 5000) {
        errors.push('Description must not exceed 5000 characters');
    }

    const { landmark, email } = req.body || {};
    if (typeof landmark === 'string' && landmark.length > 500) {
        errors.push('Landmark must not exceed 500 characters');
    }
    if (typeof email === 'string' && email.length > 254) {
        errors.push('Email must not exceed 254 characters');
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
