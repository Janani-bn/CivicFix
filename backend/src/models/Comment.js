const pool = require('../config/database');

class Comment {
    static async create({ complaintId, authorName, message }) {
        const query = `
            INSERT INTO comments (complaint_id, author_name, message)
            VALUES ($1, $2, $3)
            RETURNING id, complaint_id, author_name, message, created_at
        `;
        const result = await pool.query(query, [complaintId, authorName, message]);
        return result.rows[0];
    }

    static async findByComplaintId(complaintId) {
        // Keep the newest 200, shown oldest-first. Limiting the ascending list
        // returned the first 200 forever, so new comments never appeared once a
        // complaint passed 200. id breaks ties within the same second.
        const query = `
            SELECT id, complaint_id, author_name, message, created_at
            FROM (
                SELECT id, complaint_id, author_name, message, created_at
                FROM comments
                WHERE complaint_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 200
            ) latest
            ORDER BY created_at ASC, id ASC
        `;
        const result = await pool.query(query, [complaintId]);
        return result.rows;
    }
}

module.exports = Comment;

