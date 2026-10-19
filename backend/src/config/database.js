const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a local SQLite database file
const dbPath = path.join(__dirname, '../../civicfix.sqlite');

// Initialize the database — verbose logging only in development
const verbose = process.env.NODE_ENV === 'development' ? console.log : undefined;
const db = new Database(dbPath, { verbose });

// Register math functions required by the Haversine distance query in findNearby.
// SQLite does not provide these built-in; without them /api/complaints/nearby crashes.
// The acos wrapper clamps input to [-1, 1] to handle floating-point rounding when
// two points share the same coordinates (acos(1.0000...002) → NaN otherwise).
db.function('radians', (degrees) => (degrees * Math.PI) / 180);
db.function('acos', (value) => Math.acos(Math.min(1, Math.max(-1, value))));
db.function('cos', (value) => Math.cos(value));
db.function('sin', (value) => Math.sin(value));

// Emulate a pg-pool-like interface for minimal changes in other files
const pool = {
    /**
     * Executes a query against the SQLite database.
     * Automatically converts $1, $2 style parameters to ? for compatibility.
     */
    query: async (text, params = []) => {
        try {
            // Convert PostgreSQL style parameters ($1, $2) to SQLite style (?)
            // Our codebase sometimes reuses the same placeholder multiple times (e.g. $1 in both cos/sin).
            // When we replace with '?', we must also expand `params` to match each '?' occurrence.
            const placeholderRegex = /\$(\d+)/g;
            const expandedParams = [];
            const sqliteText = text.replace(placeholderRegex, (match, p1) => {
                const idx = Number(p1) - 1;
                expandedParams.push(params[idx]);
                return '?';
            });
            const finalParams = expandedParams.length > 0 ? expandedParams : params;
            
            const stmt = db.prepare(sqliteText);
            
            // Append 'Z' to bare SQLite datetime strings (YYYY-MM-DD HH:MM:SS) so
            // they are parsed as UTC by JS Date, not as local time.
            const normalizeRow = (row) => {
                if (!row || typeof row !== 'object') return row;
                const out = {};
                for (const [k, v] of Object.entries(row)) {
                    out[k] = (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v))
                        ? v + 'Z'
                        : v;
                }
                return out;
            };

            // For SELECT queries
            if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
                const rows = stmt.all(finalParams).map(normalizeRow);
                return { rows, rowCount: rows.length };
            }

            // For INSERT/UPDATE/DELETE with RETURNING
            if (sqliteText.toUpperCase().includes('RETURNING')) {
                // SQLite 3.35+ supports RETURNING
                const rows = stmt.all(finalParams).map(normalizeRow);
                return { rows, rowCount: rows.length };
            }
            
            // For other operations (CREATE TABLE, etc.)
            const result = stmt.run(finalParams);
            return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
        } catch (err) {
            console.error('SQLite Query Error:', err);
            throw err;
        }
    },
    
    // Add event listeners for compatibility
    on: (event, callback) => {
        if (event === 'connect') {
            console.log('Connected to SQLite database at:', dbPath);
            callback();
        }
    }
};

module.exports = pool;