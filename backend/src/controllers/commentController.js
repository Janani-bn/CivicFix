const Comment = require('../models/Comment');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

/**
 * POST /comments
 * Body: { complaintId, message, name? }
 * Auth optional: if logged in, uses user's name unless `name` is provided.
 */
const addComment = async (req, res, next) => {
    try {
        const { complaintId, message, name } = req.body || {};

        if (!complaintId || !String(complaintId).trim()) {
            return res.status(400).json({ success: false, error: { message: 'complaintId is required' } });
        }
        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, error: { message: 'message is required' } });
        }

        const normalizedComplaintId = String(complaintId).trim();
        const complaint = await Complaint.findByComplaintId(normalizedComplaintId);
        if (!complaint) {
            return res.status(404).json({ success: false, error: { message: 'Complaint not found' } });
        }

        let authorName = (name && String(name).trim()) || null;

        if (!authorName && req.user?.id) {
            const user = await User.findById(req.user.id);
            authorName = user?.name || 'User';
        }

        if (!authorName) authorName = 'Anonymous';

        const comment = await Comment.create({
            complaintId: normalizedComplaintId,
            authorName,
            message: String(message).trim()
        });

        return res.status(201).json({ success: true, data: comment });
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /comments/:complaintId
 */
const getComments = async (req, res, next) => {
    try {
        const { complaintId } = req.params;
        const comments = await Comment.findByComplaintId(String(complaintId).trim());
        return res.json({ success: true, count: comments.length, data: comments });
    } catch (err) {
        return next(err);
    }
};

module.exports = { addComment, getComments };

