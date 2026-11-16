const express = require('express');
const router = express.Router();

const {
    createRequest,
    getPendingRequests,
    approveRequest,
    rejectRequest
} = require('../controllers/volunteerController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Citizen: POST /api/volunteers/request - Submit volunteer enrollment request
router.post('/request', authenticate, createRequest);

// Admin: GET /api/volunteers/pending - List pending volunteer requests
router.get('/pending', authenticate, requireAdmin, getPendingRequests);

// Admin: POST /api/volunteers/:id/approve - Approve volunteer request
router.post('/:id/approve', authenticate, requireAdmin, approveRequest);

// Admin: POST /api/volunteers/:id/reject - Reject volunteer request
router.post('/:id/reject', authenticate, requireAdmin, rejectRequest);

module.exports = router;
