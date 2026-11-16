const bcrypt = require('bcrypt');
const pool = require('../src/config/database');

async function createAdmin() {
    const name = process.env.name;
    const email = process.env.email;
    const password = process.env.password;
    const role = 'admin';

    try {
        // Hash the password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Check if user already exists
        const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (checkUser.rowCount > 0) {
            console.log(`User ${email} already exists. Updating to admin role.`);
            await pool.query(
                'UPDATE users SET name = $1, password_hash = $2, role = $3 WHERE email = $4',
                [name, password_hash, role, email]
            );
        } else {
            console.log(`Creating new admin user: ${email}`);
            await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                [name, email, password_hash, role]
            );
        }
        
        console.log('✅ Admin user created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating admin user:', err);
        process.exit(1);
    }
}

createAdmin();
