import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Clock, MapPin, Phone, User, Calendar } from 'lucide-react';
import './TrackComplaint.css';

import { API_BASE } from '../services/api';

const TrackComplaint = () => {
    const [complaintId, setComplaintId] = useState('');
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!complaintId.trim()) {
            setError('Please enter a complaint ID');
            return;
        }

        setLoading(true);
        setError(null);
        setComplaint(null);

        try {
            const response = await fetch(`${API_BASE}/complaints/${complaintId.trim()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Complaint not found');
            }

            setComplaint(data.data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to fetch complaint details');
        } finally {
            setLoading(false);
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

    return (
        <div className="track-complaint">
            <div className="track-complaint__container">
                <div className="track-complaint__header">
                    <h1>Track Your Complaint</h1>
                    <p>Enter your complaint ID to check the current status</p>
                </div>

                <form className="track-complaint__search" onSubmit={handleSearch}>
                    <div className="search-input-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            value={complaintId}
                            onChange={(e) => setComplaintId(e.target.value)}
                            placeholder="Enter Complaint ID (e.g., CIV-ABC123)"
                            className="search-input"
                        />
                    </div>
                    <button type="submit" className="search-button" disabled={loading}>
                        {loading ? 'Searching...' : 'Track'}
                    </button>
                </form>

                {error && (
                    <div className="track-complaint__error">
                        <AlertCircle className="error-icon" />
                        <p>{error}</p>
                    </div>
                )}

                {complaint && (
                    <div className="track-complaint__result">
                        <div className="result-card">
                            <div className="result-header">
                                <div className="complaint-id">
                                    <span className="label">Complaint ID</span>
                                    <span className="value">{complaint.complaint_id}</span>
                                </div>
                                <div className={`status-badge ${getStatusClass(complaint.status)}`}>
                                    {getStatusIcon(complaint.status)}
                                    <span>{complaint.status}</span>
                                </div>
                            </div>

                            <div className="result-body">
                                <div className="info-section">
                                    <h3>Issue Details</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="label">Issue Type</span>
                                            <span className="value">{complaint.issue_type}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">Severity</span>
                                            <span className={`value severity-${complaint.severity}`}>
                                                {complaint.severity}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="label">Department</span>
                                            <span className="value">{complaint.department}</span>
                                        </div>
                                    </div>
                                </div>

                                {complaint.image_url && (
                                    <div className="info-section">
                                        <h3>Evidence Photo</h3>
                                        <img 
                                            src={`http://localhost:3000${complaint.image_url}`} 
                                            alt="Uploaded issue proof" 
                                            style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '8px' }}
                                        />
                                    </div>
                                )}

                                <div className="info-section">
                                    <h3>Description</h3>
                                    <p className="description">{complaint.description}</p>
                                </div>

                                <div className="info-section">
                                    <h3>Location</h3>
                                    <div className="location-info">
                                        <MapPin className="location-icon" />
                                        <span>{complaint.area}, {complaint.city}</span>
                                        {complaint.landmark && (
                                            <span className="landmark">Near: {complaint.landmark}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="info-section">
                                    <h3>Contact Information</h3>
                                    <div className="contact-grid">
                                        <div className="contact-item">
                                            <User className="contact-icon" />
                                            <span>{complaint.name}</span>
                                        </div>
                                        <div className="contact-item">
                                            <Phone className="contact-icon" />
                                            <span>{complaint.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="result-footer">
                                    <div className="timestamp">
                                        <Calendar className="timestamp-icon" />
                                        <span>Submitted on {new Date(complaint.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</span>
                                    </div>
                                    <div className="last-updated">
                                        Last updated: {new Date(complaint.updated_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="status-timeline">
                            <h3>Status Timeline</h3>
                            <div className="timeline">
                                <div className={`timeline-item ${complaint.status === 'Pending' || complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'active' : ''}`}>
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <h4>Complaint Received</h4>
                                        <p>Your complaint has been registered in our system</p>
                                    </div>
                                </div>
                                <div className={`timeline-item ${complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'active' : ''}`}>
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <h4>In Progress</h4>
                                        <p>Assigned to {complaint.department} and being reviewed</p>
                                    </div>
                                </div>
                                <div className={`timeline-item ${complaint.status === 'Resolved' ? 'active' : ''}`}>
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <h4>Resolved</h4>
                                        <p>Issue has been addressed and resolved</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackComplaint;