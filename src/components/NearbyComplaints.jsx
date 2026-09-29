import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, API_ORIGIN } from '../services/api';
import './NearbyComplaints.css';

const formatDate = (value) => {
  if (!value) return '';
  const iso = String(value).replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const statusClass = (status) => {
  return String(status || '')
    .toLowerCase()
    .replace(' ', '-');
};

const NearbyComplaints = () => {
  const { token, user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const radiusKm = 10;

  const fetchNearby = async (lat, lng) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/complaints/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch nearby complaints');
      }
      setComplaints(data.data || []);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch nearby complaints');
    } finally {
      setLoading(false);
    }
  };

  const hasCoordinate = (value) => value !== null && value !== undefined && value !== '';

  const handleUseSavedLocation = async () => {
    if (!hasCoordinate(user?.latitude) || !hasCoordinate(user?.longitude)) return;
    await fetchNearby(user.latitude, user.longitude);
  };

  const handleGetMyLocation = () => {
    setError('');
    setHasSearched(false);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Save for later (optional).
        if (token) {
          try {
            await fetch(`${API_BASE}/auth/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ latitude: lat, longitude: lng })
            });
          } catch {
            // Not fatal: nearby search still works.
          }
        }

        await fetchNearby(lat, lng);
      },
      (geoErr) => {
        setError(geoErr.message || 'Failed to get your location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const savedAvailable = hasCoordinate(user?.latitude) && hasCoordinate(user?.longitude);

  return (
    <section className="section">
      <div className="container nearby-issues">
        <h1 className="page-title">Nearby Issues</h1>

        <div className="prompt">
          <div className="prompt-title">Get nearby complaints (5–10 km)</div>
          <div style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Enable location first to see issues close to you.
          </div>

          <div className="prompt-actions">
            {savedAvailable && (
              <button className="btn btn-secondary" onClick={handleUseSavedLocation} disabled={loading}>
                Use saved location
              </button>
            )}
            <button className="btn btn-primary" onClick={handleGetMyLocation} disabled={loading}>
              {loading ? 'Fetching...' : 'Get my location'}
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!hasSearched && !error && (
          <div style={{ color: 'var(--color-text-muted)' }}>
            Click <b>Get my location</b> to load nearby complaints.
          </div>
        )}

        {hasSearched && !loading && complaints.length === 0 && !error && (
          <div style={{ color: 'var(--color-text-muted)' }}>No nearby complaints found.</div>
        )}

        {loading ? (
          <div style={{ color: 'var(--color-text-muted)' }}>Loading nearby complaints...</div>
        ) : (
          complaints.length > 0 && (
            <div className="complaints-grid">
              {complaints.map((c) => {
                const distanceNum =
                  typeof c.distance_km === 'number' ? c.distance_km : Number(c.distance_km);
                const distanceLabel = Number.isFinite(distanceNum) ? `${distanceNum.toFixed(1)} km away` : '';

                return (
                  <div key={c.id} className="nearby-card">
                    {c.image_url ? (
                      <img
                        className="nearby-image"
                        alt={c.issue_type}
                        src={`${API_ORIGIN}${c.image_url}`}
                      />
                    ) : (
                      <div className="nearby-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>No image</span>
                      </div>
                    )}

                    <div className="nearby-body">
                      <div className="nearby-title">{c.issue_type}</div>
                      <div className="nearby-desc">{c.description}</div>

                      <div className="nearby-meta">
                        <div className="row">
                          <div className={`status-badge ${statusClass(c.status)}`}>{c.status}</div>
                          <div className="distance">{distanceLabel}</div>
                        </div>
                        <div className="row">
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {c.area}, {c.city}
                            {c.landmark ? ` (${c.landmark})` : ''}
                          </div>
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            {formatDate(c.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default NearbyComplaints;

