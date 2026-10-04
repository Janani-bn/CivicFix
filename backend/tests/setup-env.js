// Setup for tests to bypass JWT config crash
process.env.JWT_SECRET = 'x'.repeat(48);
