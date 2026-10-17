const AI_MAX_BODY_SIZE = process.env.AI_MAX_BODY_SIZE || '100kb';
const AI_MAX_MESSAGE_LENGTH = Number(process.env.AI_MAX_MESSAGE_LENGTH || 4000);
const AI_MAX_DESCRIPTION_LENGTH = Number(process.env.AI_MAX_DESCRIPTION_LENGTH || 5000);
const AI_MAX_HISTORY_MESSAGES = Number(process.env.AI_MAX_HISTORY_MESSAGES || 20);
const AI_MAX_HISTORY_MESSAGE_LENGTH = Number(
    process.env.AI_MAX_HISTORY_MESSAGE_LENGTH || 4000
);

// General (non-AI) JSON/urlencoded body cap. Complaint text fields are a few
// KB and comments are short strings; photo uploads travel as multipart through
// multer (own 5 MB ceiling), never as JSON. 50 MB invites transport-level abuse.
const MAX_JSON_BODY_SIZE = process.env.MAX_JSON_BODY_SIZE || '1mb';

module.exports = {
    AI_MAX_BODY_SIZE,
    MAX_JSON_BODY_SIZE,
    AI_MAX_MESSAGE_LENGTH,
    AI_MAX_DESCRIPTION_LENGTH,
    AI_MAX_HISTORY_MESSAGES,
    AI_MAX_HISTORY_MESSAGE_LENGTH
};
