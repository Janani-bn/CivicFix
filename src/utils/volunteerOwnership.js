export const isMyCaseForUser = (report, user) => {
    if (!report || report.status !== "In Progress") return false;
    if (report.claimed_by_user_id !== null && report.claimed_by_user_id !== undefined) {
        return user?.id != null && report.claimed_by_user_id === user.id;
    }
    if (user?.name && (report.claimed_by === user.name || report.claimedBy === user.name)) return true;
    return false;
};
