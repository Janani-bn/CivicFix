/**
 * Transport-level request size caps for the non-AI routes.
 * Photo uploads travel as multipart through multer with its own fileSize
 * ceiling, so JSON and urlencoded bodies never legitimately approach
 * megabytes. Kept next to aiLimits so every size cap is reviewed together.
 */
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';

module.exports = { JSON_BODY_LIMIT };
