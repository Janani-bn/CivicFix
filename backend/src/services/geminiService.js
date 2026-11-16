const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are CivicFix AI Assistant — a helpful chatbot embedded in a civic issue reporting platform called CivicFix.

ABOUT CIVICFIX:
- Citizens report local infrastructure issues (potholes, garbage overflow, water leakage, streetlight outages, drainage issues, broken roads)
- Each complaint gets a unique ID like "CIV-XXXXXX"
- Complaints go through statuses: Pending → In Progress → Resolved
- Issues are auto-routed to departments: Roads Department, Sanitation, Water Department, Electrical Department, or General Administration
- Citizens can track complaints by ID, view a live feed, and see issues on a map

YOUR CAPABILITIES:
1. Answer questions about how CivicFix works
2. Help users report issues by extracting structured data from natural language descriptions
3. Help users track complaints by ID
4. Provide general guidance about civic issues

RESPONSE FORMAT RULES:
- Keep responses concise (2-4 sentences max for simple questions)
- Be friendly and professional
- When a user describes an issue they want to report, extract the details and respond with a JSON action block
- When a user wants to track a complaint, extract the ID and respond with a JSON action block

ACTION BLOCKS:
When you detect the user wants to report an issue, include this JSON at the END of your message, on its own line, prefixed with "ACTION:":
ACTION:{"type":"prefill_report","data":{"issueType":"<type>","area":"<area>","city":"<city>","landmark":"<landmark>","severity":"<low|medium|high>","description":"<cleaned up description>"}}

Valid issueType values: "Pothole", "Garbage overflow", "Water leakage", "Streetlight not working", "Drainage issue", "Broken road", "Others"

When you detect the user wants to track a complaint, include:
ACTION:{"type":"track_complaint","data":{"complaintId":"<the ID>"}}

Only include fields you can confidently extract. Omit fields you're unsure about.
If the user's message is just a greeting or general question, respond normally without any ACTION block.`;

let genAI = null;
let model = null;

function getModel() {
    if (!model) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return null;
        genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        model = genAI.getGenerativeModel({ model: modelName });
    }
    return model;
}

async function chat(userMessage, conversationHistory = []) {
    const m = getModel();
    if (!m) {
        return {
            reply: "AI features are currently unavailable. Please check back later or use the report form directly.",
            action: null
        };
    }

    const contents = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: "Understood. I'm CivicFix AI Assistant, ready to help citizens with reporting issues, tracking complaints, and answering questions about the platform." }] }
    ];

    for (const msg of conversationHistory.slice(-10)) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        });
    }

    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const result = await m.generateContent({ contents });
    const text = result.response.text();

    let action = null;
    const actionMatch = text.match(/ACTION:\s*(\{.*\})/s);
    if (actionMatch) {
        try {
            action = JSON.parse(actionMatch[1]);
        } catch (_) { /* ignore parse errors */ }
    }

    const reply = text.replace(/ACTION:\s*\{.*\}/s, '').trim();

    return { reply, action };
}

async function analyzeDescription(description) {
    const m = getModel();
    if (!m) return null;

    const prompt = `Analyze this civic complaint description and return ONLY a JSON object with these fields:
- issueType: one of "Pothole", "Garbage overflow", "Water leakage", "Streetlight not working", "Drainage issue", "Broken road", "Others"
- severity: "low", "medium", or "high" based on urgency and danger level described
- confidence: a number 0-1 indicating how confident you are

Description: "${description}"

Respond with ONLY the JSON object, no markdown formatting.`;

    const result = await m.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
}

async function enhanceDescription(description) {
    const m = getModel();
    if (!m) return null;

    const prompt = `Rewrite this civic issue complaint into a clear, well-structured description suitable for a government department to act on. Preserve all factual details. Keep it under 3 sentences. Do not add information that isn't implied by the original.

Original: "${description}"

Respond with ONLY the improved description text, nothing else.`;

    const result = await m.generateContent(prompt);
    return result.response.text().trim();
}

module.exports = { chat, analyzeDescription, enhanceDescription };
