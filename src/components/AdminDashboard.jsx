import { useState, useEffect, useCallback } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Filter,
    MapPin,
    Phone,
    User,
    Calendar,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Building2,
    Search,
    X,
    TrendingUp,
    Users,
    Bell
} from 'lucide-react';
import './AdminDashboard.css';
import { API_BASE } from '../services/api';

const DEPARTMENTS = [
    'All Departments',
    'Roads Department',
    'Sanitation',
    'Water Department',
    'Electrical Department',
    'General Administration'
];

const STATUSES = [
    'All Statuses',
    'Pending',
    'In Progress',
    'Resolved'
];

const AdminDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: 'All Statuses',
        department: 'All Departments'
    });
    const [expandedComplaint, setExpandedComplaint] = useState(null);
    const [updating, setUpdating] = useState({});
    const [activeAdminTab, setActiveAdminTab] = useState('complaints');
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [duplicatesLoading, setDuplicatesLoading] = useState(false);

    // Fetch complaints
const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
        const params = new URLSearchParams();

        if (filters.status !== 'All Statuses') {
            params.append('status', filters.status);
        }

        if (filters.department !== 'All Departments') {
            params.append('department', filters.department);
        }

        const token = localStorage.getItem('civicfix_token');

        if (!token) {
            throw new Error('Please log in as an admin to view complaints.');
        }

        const response = await fetch(
            `${API_BASE}/complaints/admin?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error?.message || 'Failed to fetch complaints'
            );
        }

        const sortedComplaints = (data.data || []).sort((a, b) => {
            const aCount = a.supporter_count || 1;
            const bCount = b.supporter_count || 1;

            if (bCount !== aCount) {
                return bCount - aCount;
            }

            return new Date(b.created_at) - new Date(a.created_at);
        });

        setComplaints(sortedComplaints);
    } catch (err) {
        console.error('Fetch complaints error:', err);
        setComplaints([]);
        setError(err.message || 'Failed to fetch complaints');
    } finally {
        setLoading(false);
    }
}, [filters]);

    const fetchDuplicates = useCallback(async () => {
        setDuplicatesLoading(true);
        try {
            const token = localStorage.getItem('civicfix_token');

const response = await fetch(`${API_BASE}/complaints/grouped-duplicates`, {
    headers: {
        Authorization: `Bearer ${token}`
    }
});
            const data = await response.json();
            if (response.ok) {
                setDuplicateGroups(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch duplicates:', err);
            setDuplicateGroups([]);
        } finally {
            setDuplicatesLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchComplaints();
        fetchDuplicates();

        const handleRefresh = () => {
            fetchComplaints();
            fetchDuplicates();
        };

        window.addEventListener('civicfix:complaint-submitted', handleRefresh);
        window.addEventListener('civicfix:complaint-joined', handleRefresh);
        window.addEventListener('civicfix:complaint-created', handleRefresh);

        return () => {
            window.removeEventListener('civicfix:complaint-submitted', handleRefresh);
            window.removeEventListener('civicfix:complaint-joined', handleRefresh);
            window.removeEventListener('civicfix:complaint-created', handleRefresh);
        };
    }, [fetchComplaints, fetchDuplicates]);

    // Update complaint status
    const updateStatus = async (id, newStatus) => {
        setUpdating(prev => ({ ...prev, [id]: true }));

        try {
            const token = localStorage.getItem('civicfix_token');

            const response = await fetch(API_BASE + '/complaints/' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to update status');
            }

            // Update local state only after backend succeeds
            setComplaints(prev =>
                prev.map(c =>
                    c.id === id ? { ...c, status: newStatus } : c
                )
            );
        } catch (err) {
            console.error('Update status error:', err);
            setError(err.message || 'Failed to update complaint status');
        } finally {
            setUpdating(prev => ({ ...prev, [id]: false }));
        }
    };

    // Assign complaint to department
    const assignDepartment = async (id, department) => {
        setUpdating(prev => ({ ...prev, [id]: true }));
        setError(null);

        try {
            const token = localStorage.getItem('civicfix_token');

            if (!token) {
                throw new Error('Please log in as an admin.');
            }

            const response = await fetch(`${API_BASE}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    complaintId: id.toString(),
                    department
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message || 'Failed to assign department'
                );
            }

            setComplaints(prev =>
                prev.map(c =>
                    c.id === id ? { ...c, department } : c
                )
            );
        } catch (err) {
            console.error('Assign department error:', err);
            setError(err.message || 'Failed to assign department');
        } finally {
            setUpdating(prev => ({ ...prev, [id]: false }));
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending':
                return <Clock className="status-icon pending" />;
            case 'In Progress':
                return <AlertCircle className="status-icon in-progress" />;
            case 'Resolved':
                return <CheckCircle className="status-icon resolved" />;
            default:
                return null;
        }
    };

    const getStatusClass = (status) => {
        return status.toLowerCase().replace(' ', '-');
    };

    const toggleExpand = (id) => {
        setExpandedComplaint(expandedComplaint === id ? null : id);
    };

    const getNextStatus = (currentStatus) => {
        switch (currentStatus) {
            case 'Pending':
                return 'In Progress';
            case 'In Progress':
                return 'Resolved';
            default:
                return null;
        }
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard__container">
                <div className="admin-dashboard__header">
                    <div className="header-title">
                        <Building2 className="header-icon" />
                        <div>
                            <h1>Admin Dashboard</h1>
                            <p>Manage and track citizen complaints</p>
                        </div>
                    </div>
                    <button
                        className="refresh-btn"
                        onClick={() => { fetchComplaints(); fetchDuplicates(); }}
                        disabled={loading}
                    >
                        <RefreshCw className={`refresh-icon ${loading ? 'spinning' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-card">
                        <span className="stat-value">{complaints.length}</span>
                        <span className="stat-label">Total Complaints</span>
                    </div>
                    <div className="stat-card pending">
                        <span className="stat-value">{complaints.filter(c => c.status === 'Pending').length}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                    <div className="stat-card in-progress">
                        <span className="stat-value">{complaints.filter(c => c.status === 'In Progress').length}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                    <div className="stat-card resolved">
                        <span className="stat-value">{complaints.filter(c => c.status === 'Resolved').length}</span>
                        <span className="stat-label">Resolved</span>
                    </div>
                    <div className="stat-card duplicate" onClick={() => setActiveAdminTab('duplicates')} style={{ cursor: 'pointer' }}>
                        <span className="stat-value">{duplicateGroups.length}</span>
                        <span className="stat-label">🔁 Duplicate Groups</span>
                    </div>
                </div>

                {/* Admin Tab Switcher */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeAdminTab === 'complaints' ? 'active' : ''}`}
                        onClick={() => setActiveAdminTab('complaints')}
                    >
                        All Complaints
                    </button>
                    <button
                        className={`admin-tab ${activeAdminTab === 'duplicates' ? 'active' : ''}`}
                        onClick={() => setActiveAdminTab('duplicates')}
                    >
                        <Bell size={16} />
                        Duplicate Reports
                        {duplicateGroups.length > 0 && (
                            <span className="admin-tab-badge">{duplicateGroups.length}</span>
                        )}
                    </button>
                </div>

                {/* Filters */}
                <div className="filters-bar">
                    <div className="filter-group">
                        <Filter className="filter-icon" />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="filter-select"
                        >
                            {STATUSES.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <Building2 className="filter-icon" />
                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="filter-select"
                        >
                            {DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="dashboard-error">
                        <AlertCircle className="error-icon" />
                        <p>{error}</p>
                    </div>
                )}

                {/* =========== DUPLICATE REPORTS TAB =========== */}
                {activeAdminTab === 'duplicates' && (
                    <div className="duplicates-panel">
                        <div className="duplicates-header">
                            <Bell size={20} className="dup-header-icon" />
                            <div>
                                <h3>Duplicate Issue Alerts</h3>
                                <p>These issues have been reported by 2 or more citizens in the same area. Consider prioritising them for faster resolution.</p>
                            </div>
                        </div>

                        {duplicatesLoading ? (
                            <div className="loading-state">
                                <RefreshCw className="loading-icon spinning" />
                                <p>Loading duplicate groups...</p>
                            </div>
                        ) : duplicateGroups.length === 0 ? (
                            <div className="dup-empty">
                                <span>✅</span>
                                <p>No duplicate reports found. All issues appear to be unique!</p>
                            </div>
                        ) : (
                            <div className="dup-list">
                                {duplicateGroups.map((group, idx) => (
                                    <div
                                        key={idx}
                                        className={`dup-card severity-${group.highest_severity || 'medium'}`}
                                    >
                                        <div className="dup-card-left">
                                            <div className="dup-count-badge">
                                                <Users size={18} />
                                                <span>{group.report_count}</span>
                                            </div>
                                            <div className="dup-info">
                                                <div className="dup-issue-type">{group.issue_type}</div>
                                                <div className="dup-location">
                                                    <MapPin size={13} />
                                                    {group.area}, {group.city}
                                                </div>
                                                <div className="dup-ids">Report IDs: {group.complaint_ids}</div>
                                            </div>
                                        </div>
                                        <div className="dup-card-right">
                                            <div className="dup-stat">
                                                <span className="dup-stat-val">{group.total_supporters || group.report_count}</span>
                                                <span className="dup-stat-label">Total Supporters</span>
                                            </div>
                                            <span className={`dup-severity-badge severity-${group.highest_severity || 'medium'}`}>
                                                {group.highest_severity || 'medium'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* =========== COMPLAINTS TAB =========== */}
                {activeAdminTab === 'complaints' && (
                    <div className="complaints-list">
                    {loading ? (
                        <div className="loading-state">
                            <RefreshCw className="loading-icon spinning" />
                            <p>Loading complaints...</p>
                        </div>
                    ) : complaints.length === 0 ? (
                        <div className="empty-state">
                            <Search className="empty-icon" />
                            <p>No complaints found</p>
                            <span>Try adjusting your filters</span>
                        </div>
                    ) : (
                        complaints.map((complaint) => (
                            <div
                                key={complaint.id}
                                className={`complaint-card ${expandedComplaint === complaint.id ? 'expanded' : ''}`}
                            >
                                <div className="complaint-header" onClick={() => toggleExpand(complaint.id)}>
                                    <div className="complaint-id">
                                        <span className="id-label">ID</span>
                                        <span className="id-value">{complaint.complaint_id}</span>
                                    </div>

                                    <div className="complaint-info">
                                        <span className="issue-type">{complaint.issue_type}</span>
                                        <span className="location">{complaint.area}, {complaint.city}</span>
                                    </div>

                                    <div className={`status-badge ${getStatusClass(complaint.status)}`}>
                                        {getStatusIcon(complaint.status)}
                                        <span>{complaint.status}</span>
                                    </div>

                                    {(complaint.supporter_count > 1) && (
                                        <div className="department-tag" style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5' }}>
                                            <TrendingUp className="dept-icon" size={16} />
                                            <span style={{ fontWeight: 600 }}>High Demand ({complaint.supporter_count})</span>
                                        </div>
                                    )}

                                    <div className="department-tag">
                                        <Building2 className="dept-icon" />
                                        <span>{complaint.department}</span>
                                    </div>

                                    <button className="expand-btn">
                                        {expandedComplaint === complaint.id ? (
                                            <ChevronUp />
                                        ) : (
                                            <ChevronDown />
                                        )}
                                    </button>
                                </div>

                                {expandedComplaint === complaint.id && (
                                    <div className="complaint-details">
                                        <div className="details-grid">
                                            <div className="detail-section">
                                                <h4>Reporter Information</h4>
                                                <div className="detail-item">
                                                    <User className="detail-icon" />
                                                    <span>{complaint.name}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <Phone className="detail-icon" />
                                                    <span>{complaint.phone}</span>
                                                </div>
                                                {complaint.email && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Email:</span>
                                                        <span>{complaint.email}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="detail-section">
                                                <h4>Location Details</h4>
                                                <div className="detail-item">
                                                    <MapPin className="detail-icon" />
                                                    <span>{complaint.area}, {complaint.city}</span>
                                                </div>
                                                {complaint.landmark && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Landmark:</span>
                                                        <span>{complaint.landmark}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="detail-section full-width">
                                                <h4>Issue Description</h4>
                                                <p>{complaint.description}</p>
                                                
                                                {complaint.image_url && (
                                                    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                                        <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Attached Evidence</h4>
                                                        <img 
                                                            src={`${API_BASE.replace('/api', '')}${complaint.image_url}`} 
                                                            alt="Complaint evidence" 
                                                            style={{ maxWidth: '400px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                                        />
                                                    </div>
                                                )}

                                                <div className="meta-tags">
                                                    <span className={`severity-tag severity-${complaint.severity}`}>
                                                        {complaint.severity} severity
                                                    </span>
                                                    <span className="date-tag">
                                                        <Calendar className="date-icon" />
                                                        {new Date(complaint.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="action-bar">
                                            <div className="action-group">
                                                <label>Assign to Department:</label>
                                                <select
                                                    value={complaint.department}
                                                    onChange={(e) => assignDepartment(complaint.id, e.target.value)}
                                                    disabled={updating[complaint.id]}
                                                    className="action-select"
                                                >
                                                    {DEPARTMENTS.filter(d => d !== 'All Departments').map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="action-group">
                                                {complaint.status !== 'Resolved' ? (
                                                    <button
                                                        className={`update-btn ${getNextStatus(complaint.status).toLowerCase().replace(' ', '-')}`}
                                                        onClick={() => updateStatus(complaint.id, getNextStatus(complaint.status))}
                                                        disabled={updating[complaint.id]}
                                                    >
                                                        {updating[complaint.id] ? 'Updating...' : `Mark as ${getNextStatus(complaint.status)}`}
                                                    </button>
                                                ) : (
                                                    <span className="resolved-badge">
                                                        <CheckCircle />
                                                        Resolved
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
