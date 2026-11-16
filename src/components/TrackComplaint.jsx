import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import './TrackComplaint.css';

import { API_BASE, API_ORIGIN } from '../services/api';
import TrackComplaintResult from './TrackComplaintResult';

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

                {complaint && <TrackComplaintResult complaint={complaint} imageBase={API_ORIGIN} />}
            </div>
        </div>
    );
};

export default TrackComplaint;