import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { API_BASE } from "../services/api";
import { useEffect, useState, useCallback } from "react";
import {
    fetchMapReports,
    MapStatusNotice,
} from "../utils/liveMapLogic";

const getColor = (severity) => {
    const s = String(severity || "").toLowerCase();
    if (s === "high") return "red";
    if (s === "medium") return "orange";
    return "green";
};
const INDIAN_CITIES = [
    { name: "Chennai", lat: 13.0827, lng: 80.2707 },
    { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
    { name: "Delhi", lat: 28.6139, lng: 77.2090 },
    { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
    { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
    { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
];

// Recenter map to specified location
const RecenterMap = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
            map.setView([coords.lat, coords.lng], coords.zoom || 15);
        }
    }, [coords, map]);
    return null;
};

const LiveMap = () => {
    const [reports, setReports] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [savedUserLocation, setSavedUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [locating, setLocating] = useState(false);
    const [mode, setMode] = useState("city"); // "myLocation" | "city"
    const [selectedCity, setSelectedCity] = useState("Chennai");
    const [activeCenter, setActiveCenter] = useState({ lat: 13.0827, lng: 80.2707, zoom: 13 });
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(null);

    // Load reports from both API (backend) and localStorage (immediate local)
    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const { apiError: err, reports: loadedReports } = await fetchMapReports({
                apiBase: API_BASE,
                fetchFn: window.fetch.bind(window),
                storage: window.localStorage,
            });
            setApiError(err);
            setReports(loadedReports);
        } catch (err) {
            console.error("Failed to load map reports:", err);
            setApiError("Failed to load complaints. Please try again.");
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();

        // Listen for new reports from the modal in the same tab
        window.addEventListener('civicfix:complaint-created', loadReports);

        // Refresh periodically for reports from other users
        const interval = setInterval(loadReports, 10000);

        return () => {
            window.removeEventListener('civicfix:complaint-created', loadReports);
            clearInterval(interval);
        };
    }, [loadReports]);

    // Auto-request location on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            setMode("city");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(coords);
                setSavedUserLocation(coords);
                setMode("myLocation");
                setActiveCenter({ lat: coords.lat, lng: coords.lng, zoom: 15 });
                setLocating(false);
                setLocationError(null);
                // Save to localStorage so report form can use it
                localStorage.setItem("userLocation", JSON.stringify(coords));
            },
            (error) => {
                setLocating(false);
                setMode("city");
                setUserLocation(null);
                setSavedUserLocation(null);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError("Location access denied. Please select a city.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError("Location unavailable. Please select a city.");
                        break;
                    case error.TIMEOUT:
                        setLocationError("Location request timed out. Please select a city.");
                        break;
                    default:
                        setLocationError("Could not get location. Please select a city.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    const handleCityChange = (cityName) => {
        setSelectedCity(cityName);
        setMode("city");
        setUserLocation(null);
        setLocationError(null);
        const city = INDIAN_CITIES.find(c => c.name === cityName);
        if (city) {
            setActiveCenter({ lat: city.lat, lng: city.lng, zoom: 13 });
        }
    };

    const switchToMyLocation = () => {
        if (savedUserLocation) {
            setMode("myLocation");
            setUserLocation(savedUserLocation);
            setLocationError(null);
            setActiveCenter({ lat: savedUserLocation.lat, lng: savedUserLocation.lng, zoom: 15 });
        }
    };

    const switchToCityMode = () => {
        setMode("city");
        setUserLocation(null);
        setLocationError(null);
        const city = INDIAN_CITIES.find(c => c.name === selectedCity) || INDIAN_CITIES[0];
        setActiveCenter({ lat: city.lat, lng: city.lng, zoom: 13 });
    };

    // Group reports by same location
    const grouped = {};
    reports.forEach((r) => {
        if (!r.lat || !r.lng) return;
        const key = `${parseFloat(r.lat).toFixed(4)}-${parseFloat(r.lng).toFixed(4)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    });

    return (
        <div style={{ height: "650px", padding: "20px" }}>
            <h2 style={{ textAlign: "center" }}>🗺️ Live Issue Map</h2>

            {/* Status bar */}
            <div style={{ textAlign: "center", marginBottom: "6px", fontSize: "13px", color: "#555" }}>
                {locating && "📍 Getting your location..."}
                {!locating && mode === "myLocation" && userLocation && "📍 Location detected — showing issues near you"}
                {!locating && mode === "city" && locationError && `⚠️ ${locationError}`}
                {!locating && mode === "city" && !locationError && `🏙️ Showing issues for ${selectedCity}`}
            </div>

            {/* Mode Controls */}
            {!locating && (
                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginBottom: "10px",
                    fontSize: "14px"
                }}>
                    {mode === "myLocation" ? (
                        <>
                            <span style={{ fontWeight: "500", color: "#1a73e8" }}>
                                📍 Mode: My Location
                            </span>
                            <button
                                type="button"
                                onClick={switchToCityMode}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    backgroundColor: "#fff",
                                    color: "#333",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    fontWeight: "500"
                                }}
                            >
                                🏙️ Choose City
                            </button>
                        </>
                    ) : (
                        <>
                            <label htmlFor="city-select" style={{ fontWeight: "500", color: "#333" }}>
                                🏙️ Select City:
                            </label>
                            <select
                                id="city-select"
                                value={selectedCity}
                                onChange={(e) => handleCityChange(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    backgroundColor: "#fff",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    outline: "none"
                                }}
                            >
                                {INDIAN_CITIES.map((city) => (
                                    <option key={city.name} value={city.name}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                            {savedUserLocation && (
                                <button
                                    type="button"
                                    onClick={switchToMyLocation}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #1a73e8",
                                        backgroundColor: "#e8f0fe",
                                        color: "#1a73e8",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        fontWeight: "500"
                                    }}
                                >
                                    📍 My Location
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Legend + count */}
            <div style={{ textAlign: "center", marginBottom: "10px", fontSize: "14px" }}>
                🔴 High &nbsp;|&nbsp; 🟡 Medium &nbsp;|&nbsp; 🟢 Low
                <span style={{ marginLeft: "16px", color: "#888", fontSize: "13px" }}>
                    {reports.filter(r => r.lat && r.lng).length} issue(s) on map
                    {reports.filter(r => !r.lat || !r.lng).length > 0 &&
                        ` · ${reports.filter(r => !r.lat || !r.lng).length} without location`}
                </span>
            </div>

            {/* Loading / Empty / Error state notice */}
            <MapStatusNotice
                loading={loading}
                apiError={apiError}
                reportsCount={reports.length}
                onRetry={loadReports}
            />

            <MapContainer
                center={[activeCenter.lat, activeCenter.lng]}
                zoom={activeCenter.zoom || 13}
                style={{ height: "550px", borderRadius: "12px" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Recenter map whenever activeCenter changes */}
                <RecenterMap coords={activeCenter} />

                {/* User's own location marker (only rendered in myLocation mode) */}
                {userLocation && mode === "myLocation" && (
                    <CircleMarker
                        center={[userLocation.lat, userLocation.lng]}
                        radius={10}
                        pathOptions={{
                            color: "#1a73e8",
                            fillColor: "#4da3ff",
                            fillOpacity: 0.9,
                        }}
                    >
                        <Popup>
                            <strong>📍 Your location</strong>
                        </Popup>
                    </CircleMarker>
                )}

                {/* Render grouped issue markers */}
                {Object.values(grouped).map((group, groupIndex) =>
                    group.map((report, i) => {
                        const angle = (i / group.length) * 2 * Math.PI;
                        const offset = group.length > 1 ? 0.0003 : 0;
                        const lat = parseFloat(report.lat) + offset * Math.cos(angle);
                        const lng = parseFloat(report.lng) + offset * Math.sin(angle);

                        return (
                            <CircleMarker
                                key={`${groupIndex}-${i}`}
                                center={[lat, lng]}
                                radius={8}
                                pathOptions={{
                                    color: getColor(report.severity),
                                    fillColor: getColor(report.severity),
                                    fillOpacity: 0.8,
                                }}
                            >
                                <Popup>
                                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                        <strong>{report.issueType}</strong>
                                        <br />📍 {report.place || "Location not specified"}
                                        <br />⚠️ {report.severity}
                                        <br />📅 {report.date}
                                        <br />🏢 {report.department}
                                        <br />📊 {report.status}
                                        {group.length > 1 && (
                                            <div style={{ marginTop: "6px", color: "#e67e22", fontWeight: "500" }}>
                                                🔥 {group.length} issues at this location
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })
                )}
            </MapContainer>
        </div>
    );
};

export default LiveMap;