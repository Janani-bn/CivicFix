import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";
import "./VolunteerDashboard.css";

const HIGH_CASE_VOLUNTEER_THRESHOLD = 10;

const SEVERITY_COLOR = {
    Low: "sev-low",
    low: "sev-low",
    Medium: "sev-med",
    medium: "sev-med",
    High: "sev-high",
    high: "sev-high",
};

const formatSeverity = (sev) => {
    if (!sev) return "Low";
    const lower = sev.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const canVolunteerTake = (report) => {
    const sev = (report.severity || "").toLowerCase();
    if (sev === "low" || sev === "medium") return true;
    if (
        sev === "high" &&
        report.status !== "Resolved" &&
        (report.supporter_count || report.reportCount || 1) < HIGH_CASE_VOLUNTEER_THRESHOLD
    )
        return true;
    return false;
};

const VolunteerDashboard = () => {
    const { token, user } = useAuth();
    const [reports, setReports] = useState([]);
    const [filter, setFilter] = useState("All");
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const volunteerName = user?.name || "Volunteer";

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetch(`${API_BASE}/complaints`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setReports(data.data || []);
            } else {
                setError(data.error?.message || "Failed to load complaints");
            }
        } catch {
            setError("Network error loading complaints");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user && user.role !== "volunteer" && user.role !== "admin") {
            navigate("/");
            return;
        }
        fetchReports();
    }, [user, navigate, fetchReports]);

    const handleClaim = async (id) => {
        setActionLoadingId(id);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/complaints/${id}/claim`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error?.message || "Failed to claim case");
                return;
            }
            const updated = data.data;
            setReports((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r))
            );
        } catch {
            alert("Network error claiming case");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleResolve = async (id) => {
        setActionLoadingId(id);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error?.message || "Failed to resolve case");
                return;
            }
            const updated = data.data;
            setReports((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r))
            );
        } catch {
            alert("Network error resolving case");
        } finally {
            setActionLoadingId(null);
        }
    };

    const isMyCase = (r) => {
        if (r.status !== "In Progress") return false;
        if (user?.id && r.claimed_by_user_id === user.id) return true;
        if (user?.name && (r.claimed_by === user.name || r.claimedBy === user.name)) return true;
        return false;
    };

    const myCases = reports.filter(isMyCase);
    const availableCases = reports.filter(
        (r) => r.status === "Pending" && canVolunteerTake(r)
    );

    const filteredAvailable =
        filter === "All"
            ? availableCases
            : availableCases.filter(
                (r) => (r.severity || "").toLowerCase() === filter.toLowerCase()
            );

    if (loading) {
        return <div className="vdash-wrap" style={{ padding: "6rem 1.5rem" }}>Loading volunteer dashboard...</div>;
    }

    return (
        <div className="vdash-wrap">
            <div className="vdash-header">
                <div>
                    <h2 className="vdash-title">Volunteer Dashboard</h2>
                    <p className="vdash-sub">Welcome, {volunteerName}</p>
                </div>
                <div className="vdash-stats">
                    <div className="vstat">
                        <p className="vstat-val">{myCases.length}</p>
                        <p className="vstat-label">My active cases</p>
                    </div>
                    <div className="vstat">
                        <p className="vstat-val">{availableCases.length}</p>
                        <p className="vstat-label">Available to claim</p>
                    </div>
                </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="vdash-notice">
                <span className="notice-icon">ℹ</span>
                You can resolve <strong>Low</strong> and <strong>Moderate</strong> cases
                directly. <strong>High severity</strong> cases are shown only when they
                are unresolved and under-reported — government handles the rest.
            </div>

            {/* My claimed cases */}
            {myCases.length > 0 && (
                <div className="vsection">
                    <h3 className="vsection-title">My claimed cases</h3>
                    <div className="vcard-list">
                        {myCases.map((r) => {
                            const sevDisplay = formatSeverity(r.severity);
                            const place = r.place || (r.area ? `${r.area}${r.city ? ", " + r.city : ""}` : "Location not specified");
                            const dateDisplay = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : "");

                            return (
                                <div className="vcard claimed" key={r.id}>
                                    <div className="vcard-top">
                                        <span className={`vsev ${SEVERITY_COLOR[sevDisplay]}`}>
                                            {sevDisplay}
                                        </span>
                                        <span className="vcard-type">{r.issue_type || r.issueType}</span>
                                    </div>
                                    <p className="vcard-place">📍 {place}</p>
                                    {dateDisplay && <p className="vcard-date">Reported on {dateDisplay}</p>}
                                    {r.description && (
                                        <p className="vcard-desc">{r.description}</p>
                                    )}
                                    <div className="vcard-actions">
                                        <span className="in-progress-badge">In progress</span>
                                        <button
                                            className="vbtn-resolve"
                                            disabled={actionLoadingId === r.id}
                                            onClick={() => handleResolve(r.id)}
                                        >
                                            {actionLoadingId === r.id ? "Resolving..." : "Mark as resolved"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="vfilter-row">
                {["All", "Low", "Medium", "High"].map((f) => (
                    <button
                        key={f}
                        className={`vfilter-btn ${filter === f ? "active" : ""}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Available cases */}
            <div className="vsection">
                <h3 className="vsection-title">Available cases</h3>
                {filteredAvailable.length === 0 ? (
                    <div className="vempty">No cases available right now. Check back later!</div>
                ) : (
                    <div className="vcard-list">
                        {filteredAvailable.map((r) => {
                            const sevDisplay = formatSeverity(r.severity);
                            const place = r.place || (r.area ? `${r.area}${r.city ? ", " + r.city : ""}` : "Location not specified");
                            const dateDisplay = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : "");

                            return (
                                <div className="vcard" key={r.id}>
                                    <div className="vcard-top">
                                        <span className={`vsev ${SEVERITY_COLOR[sevDisplay]}`}>
                                            {sevDisplay}
                                        </span>
                                        <span className="vcard-type">{r.issue_type || r.issueType}</span>
                                        {sevDisplay === "High" && (
                                            <span className="high-tag">Low count — volunteer eligible</span>
                                        )}
                                    </div>
                                    <p className="vcard-place">📍 {place}</p>
                                    {dateDisplay && <p className="vcard-date">Reported on {dateDisplay}</p>}
                                    {r.description && (
                                        <p className="vcard-desc">{r.description}</p>
                                    )}
                                    <div className="vcard-actions">
                                        <button
                                            className="vbtn-claim"
                                            disabled={actionLoadingId === r.id}
                                            onClick={() => handleClaim(r.id)}
                                        >
                                            {actionLoadingId === r.id ? "Claiming..." : "Claim this case"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VolunteerDashboard;