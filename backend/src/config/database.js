const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a local SQLite database file
const dbPath = path.join(__dirname, '../../civicfix.sqlite');

// Initialize the database
const db = new Database(dbPath, { verbose: console.log });

// Register math functions used by the Haversine distance calculation
db.function('radians', (degrees) => degrees * Math.PI / 180);
db.function('sin', Math.sin);
db.function('cos', Math.cos);
db.function('acos', Math.acos);

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

            const finalParams =
                expandedParams.length > 0 ? expandedParams : params;

            const stmt = db.prepare(sqliteText);

            // For SELECT queries
            if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
                const rows = stmt.all(finalParams);
                return { rows, rowCount: rows.length };
            }

            // For INSERT/UPDATE/DELETE with RETURNING
            if (sqliteText.toUpperCase().includes('RETURNING')) {
                // SQLite 3.35+ supports RETURNING
                const rows = stmt.all(finalParams);
                return { rows, rowCount: rows.length };
            }

            // For other operations (CREATE TABLE, etc.)
            const result = stmt.run(finalParams);

            return {
                rows: [],
                rowCount: result.changes,
                lastInsertRowid: result.lastInsertRowid
            };
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