/**
 * Utility to generate a WhatsApp Click-to-Chat link (wa.me)
 * @param {string} phone - User's phone number
 * @param {object} details - Complaint details
 * @returns {string|null} - The generated WhatsApp link or null if phone is missing
 */
const generateWhatsAppLink = (phone, details) => {
    if (!phone) return null;

    // Remove any non-numeric characters and ensure '91' prefix
    let cleanPhone = phone.replace(/\D/g, '');

    // E.164: no telephone number exceeds 15 digits. Longer digit runs build
    // wa.me links that can never reach anyone — return null instead (the
    // complaint response and success view already tolerate a null link).
    if (cleanPhone.length > 15) {
        return null;
    }

    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    const { complaintId, issueType, area, city, status } = details;
    const location = `${area}, ${city}`;

    // Format the message template
    const text = `Complaint Registered:
ID: ${complaintId}
Issue: ${issueType}
Location: ${location}
Status: ${status}`;

    // URL encode the message
    const encodedMessage = encodeURIComponent(text);

    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

module.exports = { generateWhatsAppLink };
