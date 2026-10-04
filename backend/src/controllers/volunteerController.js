const VolunteerRequest = require('../models/VolunteerRequest');
const User = require('../models/User');

const createRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not found' }
            });
        }

        if (user.role === 'volunteer' || user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: { message: 'User is already a volunteer or admin' }
            });
        }

        const existingPending = await VolunteerRequest.findPendingByUserId(userId);
        if (existingPending) {
            return res.status(409).json({
                success: false,
                error: { message: 'Volunteer request is already pending' }
            });
        }

        const request = await VolunteerRequest.create({ userId });
        return res.status(201).json({
            success: true,
            data: { request }
        });
    } catch (err) {
        return next(err);
    }
};

const getPendingRequests = async (req, res, next) => {
    try {
        const requests = await VolunteerRequest.findPending();
        return res.json({
            success: true,
            data: requests
        });
    } catch (err) {
        return next(err);
    }
};

const approveRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;
        const adminId = req.user.id;

        const request = await VolunteerRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: { message: 'Volunteer request not found' }
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: { message: `Volunteer request is already ${request.status}` }
            });
        }

        const approvedRequest = await VolunteerRequest.approve(requestId, adminId);
        if (!approvedRequest) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to approve volunteer request' }
            });
        }

        const updatedUser = await User.updateRole(request.user_id, 'volunteer');

        return res.json({
            success: true,
            data: {
                request: approvedRequest,
                user: updatedUser
            }
        });
    } catch (err) {
        return next(err);
    }
};

const rejectRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;
        const adminId = req.user.id;

        const request = await VolunteerRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: { message: 'Volunteer request not found' }
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: { message: `Volunteer request is already ${request.status}` }
            });
        }

        const rejectedRequest = await VolunteerRequest.reject(requestId, adminId);
        if (!rejectedRequest) {
            return res.status(400).json({
                success: false,
                error: { message: 'Failed to reject volunteer request' }
            });
        }

        return res.json({
            success: true,
            data: {
                request: rejectedRequest
            }
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    createRequest,
    getPendingRequests,
    approveRequest,
    rejectRequest
};
