const pool = require('../config/database');
const { generateComplaintId } = require('../utils/generateId');
const { routeToDepartment } = require('../utils/departmentRouter');

class Complaint {
    /**
     * Create a new complaint
     * @param {Object} complaintData - Complaint data
     * @returns {Object} Created complaint
     */
    static async create(complaintData, userId = null) {
        const {
            name,
            phone,
            email,
            area,
            city,
            landmark,
            issueType,
            description,
            severity = 'medium',
            duration,
            allowVolunteers = 'no',
            wantUpdates = 'no',
            imageUrl,
            latitude,
            longitude
        } = complaintData;

        const complaintId = generateComplaintId();
        const department = routeToDepartment(issueType);

        const query = `
            INSERT INTO complaints (
                complaint_id, name, phone, email, area, city, landmark,
                issue_type, description, severity, duration,
                allow_volunteers, want_updates, image_url,
                latitude, longitude, department, status, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Pending', $18)
            RETURNING *
        `;

        const values = [
            complaintId, name, phone, email, area, city, landmark,
            issueType, description, severity, duration,
            allowVolunteers, wantUpdates, imageUrl,
            latitude, longitude, department, userId
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Find complaint by complaint_id
     * @param {string} complaintId - The complaint ID (e.g., CIV-123456)
     * @returns {Object|null} Complaint data or null
     */
    static async findByComplaintId(complaintId) {
        const query = 'SELECT * FROM complaints WHERE complaint_id = $1';
        const result = await pool.query(query, [complaintId]);
        return result.rows[0] || null;
    }

    /**
     * Find complaint by internal id
     * @param {number} id - The internal database ID
     * @returns {Object|null} Complaint data or null
     */
    static async findById(id) {
        const query = 'SELECT * FROM complaints WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Get all complaints with optional filters
     * @param {Object} filters - Optional filters (status, department)
     * @returns {Array} List of complaints
     */
    static async findAll(filters = {}) {
        let query = `
            SELECT
                c.*,
                COALESCE(u.name, c.name) AS reporter_name
            FROM complaints c
            LEFT JOIN users u ON u.id = c.user_id
        `;
        const values = [];
        const conditions = [];

        if (filters.status) {
            conditions.push(`c.status = $${values.length + 1}`);
            values.push(filters.status);
        }

        if (filters.department) {
            conditions.push(`c.department = $${values.length + 1}`);
            values.push(filters.department);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await pool.query(query, values);
        return result.rows;
    }

    /**
     * Get complaints for a specific user
     * @param {number} userId
     * @returns {Array}
     */
    static async findByUserId(userId) {
        const query = `
            SELECT
                c.*,
                COALESCE(u.name, c.name) AS reporter_name
            FROM complaints c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get nearby complaints using Haversine distance
     * Note: Uses duplicated placeholders (handled by our SQLite wrapper).
     */
    static async findNearby(lat, lng, radiusKm = 10) {
        const query = `
            SELECT * FROM (
                SELECT
                    c.*,
                    COALESCE(u.name, c.name) AS reporter_name,
                    (6371 * acos(
                        cos(radians($1)) * cos(radians(c.latitude)) *
                        cos(radians(c.longitude) - radians($2)) +
                        sin(radians($1)) * sin(radians(c.latitude))
                    )) AS distance_km
                FROM complaints c
                LEFT JOIN users u ON u.id = c.user_id
                WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            ) sub
            WHERE distance_km <= $3
            ORDER BY distance_km ASC
            LIMIT 200
        `;
        const result = await pool.query(query, [lat, lng, radiusKm]);
        return result.rows;
    }

    /**
     * Update complaint status
     * @param {number} id - Complaint internal ID
     * @param {string} status - New status (Pending, In Progress, Resolved)
     * @returns {Object} Updated complaint
     */
    static async updateStatus(id, status) {
        const validStatuses = ['Pending', 'In Progress', 'Resolved'];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const query = `
            UPDATE complaints
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [status, id]);
        return result.rows[0] || null;
    }

    /**
     * Assign complaint to department
     * @param {number} id - Complaint internal ID
     * @param {string} department - Department name
     * @returns {Object} Updated complaint
     */
    static async assignToDepartment(id, department) {
        const query = `
            UPDATE complaints
            SET department = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [department, id]);
        return result.rows[0] || null;
    }

    /**
     * Auto-assign to department based on issue type
     * @param {number} id - Complaint internal ID
     * @param {string} issueType - Type of issue
     * @returns {Object} Updated complaint
     */
    static async autoAssignToDepartment(id, issueType) {
        const department = routeToDepartment(issueType);
        return this.assignToDepartment(id, department);
    }

    /**
     * Join an existing complaint (increment supporter count & record the join)
     * @param {number} id - Complaint internal ID
     * @param {number|null} userId - User's internal ID (null if anonymous)
     * @param {string|null} sessionId - Anonymous session ID for tracking
     * @returns {Object} Updated complaint
     */
    static async join(id, userId = null, sessionId = null) {
        const query = `
            UPDATE complaints
            SET supporter_count = supporter_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id]);
        const complaint = result.rows[0] || null;

        if (complaint) {
            // Record who joined so it appears in My Complaints
            await pool.query(
                `INSERT INTO complaint_joins (complaint_id, user_id, session_id) VALUES ($1, $2, $3)`,
                [id, userId, sessionId]
            );
        }

        return complaint;
    }

    /**
     * Get all complaints that a user has joined (for My Complaints page)
     * @param {number} userId
     * @returns {Array}
     */
    static async getJoinedByUser(userId) {
        const query = `
            SELECT
                c.*,
                cj.joined_at,
                'joined' AS relation_type
            FROM complaint_joins cj
            JOIN complaints c ON c.id = cj.complaint_id
            WHERE cj.user_id = $1
            ORDER BY cj.joined_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get grouped duplicate complaints for admin (where 2+ people reported same issue type in same area)
     * @returns {Array}
     */
    static async getGroupedDuplicates() {
        const query = `
            SELECT
                issue_type,
                area,
                city,
                COUNT(*) AS report_count,
                SUM(supporter_count) AS total_supporters,
                CASE MAX(
                    CASE LOWER(COALESCE(severity, ''))
                        WHEN 'high' THEN 3
                        WHEN 'medium' THEN 2
                        WHEN 'low' THEN 1
                        ELSE 0
                    END
                )
                    WHEN 3 THEN 'high'
                    WHEN 2 THEN 'medium'
                    WHEN 1 THEN 'low'
                    ELSE 'medium'
                END AS highest_severity,
                MIN(created_at) AS first_reported,
                MAX(created_at) AS last_reported,
                GROUP_CONCAT(complaint_id, ', ') AS complaint_ids
            FROM complaints
            GROUP BY LOWER(issue_type), LOWER(area), LOWER(city)
            HAVING COUNT(*) >= 2
            ORDER BY report_count DESC, total_supporters DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Delete complaint
     * @param {number} id - Complaint internal ID
     * @returns {boolean} Success status
     */
    static async delete(id) {
        const query = 'DELETE FROM complaints WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rowCount > 0;
    }

    /**
     * Claim a complaint (Volunteer)
     * @param {number|string} id - Complaint internal ID or complaint_id
     * @param {number} volunteerId - Authenticated volunteer user ID
     * @param {string} volunteerName - Authenticated volunteer name
     * @returns {Object|null} Updated complaint or null if not claimable / conflict
     */
    static async claim(id, volunteerId, volunteerName) {
        let complaintId = id;
        if (typeof id === 'string' && id.startsWith('CF-')) {
            const existing = await this.findByComplaintId(id);
            if (!existing) return null;
            complaintId = existing.id;
        }

        const query = `
            UPDATE complaints
            SET status = 'In Progress',
                claimed_by_user_id = $1,
                claimed_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND status = 'Pending' AND (claimed_by_user_id IS NULL OR claimed_by_user_id = $1)
            RETURNING *
        `;

        const result = await pool.query(query, [volunteerId, volunteerName, complaintId]);
        return result.rows[0] || null;
    }

    /**
     * Resolve a complaint (Volunteer)
     * @param {number|string} id - Complaint internal ID or complaint_id
     * @param {number} volunteerId - Authenticated volunteer user ID
     * @param {string} volunteerName - Authenticated volunteer name
     * @returns {Object|null} Updated complaint or null if invalid transition
     */
    static async resolve(id, volunteerId, volunteerName) {
        let complaintId = id;
        if (typeof id === 'string' && id.startsWith('CF-')) {
            const existing = await this.findByComplaintId(id);
            if (!existing) return null;
            complaintId = existing.id;
        }

        const query = `
            UPDATE complaints
            SET status = 'Resolved',
                resolved_by_user_id = $1,
                resolved_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND status = 'In Progress' AND (claimed_by_user_id = $1 OR claimed_by_user_id IS NULL)
            RETURNING *
        `;

        const result = await pool.query(query, [volunteerId, volunteerName, complaintId]);
        return result.rows[0] || null;
    }
}

module.exports = Complaint;
