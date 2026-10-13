/* global module */
const { removeUploadedFile } = require('./uploadMiddleware');
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
const { COMPLAINT_FIELD_LIMITS } = require('../utils/complaintLimits');

/**
 * Push a length error when the value is a string longer than the allowed max.
 * Non-string values are ignored here; the required-field checks below already
 * report those.
 */
const pushLengthError = (errors, label, value, max) => {
    if (typeof value === 'string' && value.length > max) {
        errors.push(`${label} must not exceed ${max} characters`);
    }
};

/**
 * Validate complaint creation data
 */
const validateComplaint = (req, res, next) => {
    const {
        name,
        phone,
        email,
        area,
        city,
        landmark,
        issueType,
        description,
        duration
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
    }

    if (typeof phone !== 'string' || phone.trim() === '') {
        errors.push('Phone is required');
    } else if (!/^[\d\s\-+()]{10,}$/.test(phone)) {
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

    // Length limits. Without these a single request can store megabytes of text
    // because the body parsers allow up to 50mb.
    pushLengthError(errors, 'Name', name, COMPLAINT_FIELD_LIMITS.name);
    pushLengthError(errors, 'Phone', phone, COMPLAINT_FIELD_LIMITS.phone);
    pushLengthError(errors, 'Email', email, COMPLAINT_FIELD_LIMITS.email);
    pushLengthError(errors, 'Area', area, COMPLAINT_FIELD_LIMITS.area);
    pushLengthError(errors, 'City', city, COMPLAINT_FIELD_LIMITS.city);
    pushLengthError(errors, 'Landmark', landmark, COMPLAINT_FIELD_LIMITS.landmark);
    pushLengthError(errors, 'Issue type', issueType, COMPLAINT_FIELD_LIMITS.issueType);
    pushLengthError(errors, 'Description', description, COMPLAINT_FIELD_LIMITS.description);
    pushLengthError(errors, 'Duration', duration, COMPLAINT_FIELD_LIMITS.duration);

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
