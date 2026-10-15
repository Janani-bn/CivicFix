/**
 * Maximum accepted length for each user supplied complaint field.
 * Kept in one module so the API limits can be reviewed and adjusted together.
 */
const COMPLAINT_FIELD_LIMITS = {
    name: 120,
    phone: 20,
    email: 254,
    area: 120,
    city: 120,
    landmark: 200,
    issueType: 120,
    description: 5000,
    duration: 100
};

module.exports = { COMPLAINT_FIELD_LIMITS };
