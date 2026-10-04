const pool = require('../config/database');

class VolunteerRequest {
    static async create({ userId }) {
        const query = `
            INSERT INTO volunteer_requests (user_id, status)
            VALUES ($1, 'pending')
            RETURNING id, user_id, status, reviewed_by, reviewed_at, created_at, updated_at
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    static async findPendingByUserId(userId) {
        const query = `
            SELECT id, user_id, status, reviewed_by, reviewed_at, created_at, updated_at
            FROM volunteer_requests
            WHERE user_id = $1 AND status = 'pending'
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const query = `
            SELECT id, user_id, status, reviewed_by, reviewed_at, created_at, updated_at
            FROM volunteer_requests
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    static async findPending() {
        const query = `
            SELECT vr.id, vr.user_id, vr.status, vr.reviewed_by, vr.reviewed_at, vr.created_at, vr.updated_at,
                   u.name AS user_name, u.email AS user_email
            FROM volunteer_requests vr
            JOIN users u ON vr.user_id = u.id
            WHERE vr.status = 'pending'
            ORDER BY vr.created_at ASC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async approve(id, adminId) {
        const query = `
            UPDATE volunteer_requests
            SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'pending'
            RETURNING id, user_id, status, reviewed_by, reviewed_at, created_at, updated_at
        `;
        const result = await pool.query(query, [adminId, id]);
        return result.rows[0] || null;
    }

    static async reject(id, adminId) {
        const query = `
            UPDATE volunteer_requests
            SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'pending'
            RETURNING id, user_id, status, reviewed_by, reviewed_at, created_at, updated_at
        `;
        const result = await pool.query(query, [adminId, id]);
        return result.rows[0] || null;
    }
}

module.exports = VolunteerRequest;
