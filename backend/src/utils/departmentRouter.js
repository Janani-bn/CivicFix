// Department routing logic based on issue type
const routeToDepartment = (issueType) => {
    if (typeof issueType !== 'string' || !issueType.trim()) {
        return 'General Administration';
    }

    const normalizedType = issueType.toLowerCase().trim();

    if (normalizedType.includes('pothole') || normalizedType.includes('road')) {
        return 'Roads Department';
    }
    if (normalizedType.includes('garbage') || normalizedType.includes('waste') || normalizedType.includes('trash')) {
        return 'Sanitation';
    }
    if (normalizedType.includes('water') || normalizedType.includes('leak') || normalizedType.includes('pipe')) {
        return 'Water Department';
    }
    if (normalizedType.includes('electric') || normalizedType.includes('streetlight') || normalizedType.includes('power')) {
        return 'Electrical Department';
    }

    // Default department for unrecognized issues
    return 'General Administration';
};

module.exports = { routeToDepartment };