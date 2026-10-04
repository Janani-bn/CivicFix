const JWT_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

if (JWT_SECRET === 'your_secure_random_secret_here') {
    throw new Error('JWT_SECRET must not be the default placeholder');
}

if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be securely generated and at least 32 characters long');
}

module.exports = { JWT_SECRET };
