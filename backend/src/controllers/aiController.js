const gemini = require('../services/geminiService');

const {
    AI_MAX_MESSAGE_LENGTH,
    AI_MAX_DESCRIPTION_LENGTH,
    AI_MAX_HISTORY_MESSAGES,
    AI_MAX_HISTORY_MESSAGE_LENGTH
} = require('../utils/aiLimits');

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) return false;

    entry.count++;
    return true;
}

/**
 * POST /api/ai/chat
 * Body: { message: string, conversationHistory: Array<{role, text}> }
 */
const chatWithAI = async (req, res, next) => {
    try {
        if (!checkRateLimit(req.ip)) {
            return res.status(429).json({
                success: false,
                error: { message: 'Too many AI requests. Please wait a moment.' }
            });
        }

        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: { message: 'Message is required' }
            });
        }

        if (message.length > AI_MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Message must not exceed ${AI_MAX_MESSAGE_LENGTH} characters`
                }
            });
        }

        if (!Array.isArray(conversationHistory)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Conversation history must be an array'
                }
            });
        }

        if (conversationHistory.length > AI_MAX_HISTORY_MESSAGES) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Conversation history must not exceed ${AI_MAX_HISTORY_MESSAGES} messages`
                }
            });
        }

        for (const entry of conversationHistory) {
            if (
                !entry ||
                typeof entry !== 'object' ||
                typeof entry.text !== 'string' ||
                entry.text.length > AI_MAX_HISTORY_MESSAGE_LENGTH
            ) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: `Each conversation history message must not exceed ${AI_MAX_HISTORY_MESSAGE_LENGTH} characters`
                    }
                });
            }
        }

        const result = await gemini.chat(
            message.trim(),
            conversationHistory
        );

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[AI Chat Error]', err.message);

        res.json({
            success: true,
            data: {
                reply: "I'm currently running in limited mode due to high demand. I can still help you report issues or track complaints!",
                fallback: true
            }
        });
    }
};

/**
 * POST /api/ai/analyze-description
 * Body: { description: string }
 */
const analyzeDescription = async (req, res, next) => {
    try {
        if (!checkRateLimit(req.ip)) {
            return res.status(429).json({
                success: false,
                error: { message: 'Too many AI requests. Please wait a moment.' }
            });
        }

        const { description } = req.body;

        if (
            !description ||
            typeof description !== 'string' ||
            description.trim().length < 10
        ) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Description must be at least 10 characters'
                }
            });
        }

        if (description.length > AI_MAX_DESCRIPTION_LENGTH) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Description must not exceed ${AI_MAX_DESCRIPTION_LENGTH} characters`
                }
            });
        }

        const result = await gemini.analyzeDescription(description.trim());

        if (!result) {
            return res.status(503).json({
                success: false,
                error: { message: 'AI service unavailable' }
            });
        }

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/enhance-description
 * Body: { description: string }
 */
const enhanceDescription = async (req, res, next) => {
    try {
        if (!checkRateLimit(req.ip)) {
            return res.status(429).json({
                success: false,
                error: { message: 'Too many AI requests. Please wait a moment.' }
            });
        }

        const { description } = req.body;

        if (
            !description ||
            typeof description !== 'string' ||
            description.trim().length < 10
        ) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Description must be at least 10 characters'
                }
            });
        }

        if (description.length > AI_MAX_DESCRIPTION_LENGTH) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Description must not exceed ${AI_MAX_DESCRIPTION_LENGTH} characters`
                }
            });
        }

        const enhanced = await gemini.enhanceDescription(
            description.trim()
        );

        if (!enhanced) {
            return res.status(503).json({
                success: false,
                error: { message: 'AI service unavailable' }
            });
        }

        res.json({
            success: true,
            data: { enhanced }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    chatWithAI,
    analyzeDescription,
    enhanceDescription
};