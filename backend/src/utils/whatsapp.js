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

    // wa.me wants the country code with no prefix, and no country code starts
    // with 0. Drop a trunk "0" (09876543210) or an international "00" (0091...).
    cleanPhone = cleanPhone.replace(/^0+/, '');
    if (!cleanPhone) return null;

    // No valid E.164 number exceeds 15 digits. Anything longer is not a
    // real recipient, so decline the link instead of pointing at one.
    if (cleanPhone.length > 15) return null;
    
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
