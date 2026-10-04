const express = require('express');
const router = express.Router();

const {
    createComplaint,
    getComplaintById,
    getAllComplaints,
    getComplaintsByUser,
    getJoinedComplaints,
    getNearbyComplaints,
    updateComplaintStatus,
    assignComplaint,
    joinComplaint,
    getGroupedDuplicates,
    claimComplaint,
    resolveComplaint
} = require('../controllers/complaintController');

const {
    validateComplaint,
    validateStatusUpdate,
    validateDepartmentAssignment
} = require('../middleware/validateComplaint');

const upload = require('../middleware/uploadMiddleware');

const {
    authenticate,
    authenticateOptional,
    requireVolunteer
} = require('../middleware/auth');

const authorizeAdmin = require('../middleware/authorizeAdmin');

// Routes match the architecture specification:

// 1. POST /complaints - Create complaint
// Generates unique complaint ID, stores in database, handles image upload
router.post('/', upload.single('image'), authenticateOptional, validateComplaint, createComplaint);

// 2. GET /complaints/user - List complaints for current user
router.get('/user', authenticate, getComplaintsByUser);

// GET /complaints/joined - List complaints the user has joined
router.get('/joined', authenticate, getJoinedComplaints);

// 3. GET /complaints/nearby - Nearby complaints for volunteer dashboard
router.get('/nearby', getNearbyComplaints);

// Admin: GET /complaints/grouped-duplicates - complaints grouped by area+type (count >= 2)
router.get('/grouped-duplicates', getGroupedDuplicates);

// Volunteer: POST /complaints/:id/claim - Claim complaint
router.post('/:id/claim', authenticate, requireVolunteer, claimComplaint);

// Volunteer: POST /complaints/:id/resolve - Resolve complaint
router.post('/:id/resolve', authenticate, requireVolunteer, resolveComplaint);

// 4. GET /complaints/:id - Fetch complaint details
router.get('/:id', getComplaintById);

// 5. GET /complaints - List all complaints (admin)
router.get('/', getAllComplaints);

// 6. PUT /complaints/:id - Update status (Pending → In Progress → Resolved)
// Requires authentication and admin authorization.
router.put(
    '/:id',
    authenticate,
    authorizeAdmin,
    validateStatusUpdate,
    updateComplaintStatus
);

// 7. POST /complaints/:id/join - Join existing complaint
router.post('/:id/join', authenticateOptional, joinComplaint);

// 8. POST /assign - Assign complaint to department
// (Note: This is mounted at /api/assign in server.js)
router.post('/assign', validateDepartmentAssignment, assignComplaint);

module.exports = router;