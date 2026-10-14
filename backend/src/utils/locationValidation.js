/**
 * Shared geographic range checks for the location and nearby endpoints.
 * Keeps the numeric limits in one place so auth and complaint
 * controllers validate the same way.
 */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MAX_RADIUS_KM = 100;

const isValidLatitude = (value) => {
    return Number.isFinite(value) && value >= MIN_LATITUDE && value <= MAX_LATITUDE;
};

const isValidLongitude = (value) => {
    return Number.isFinite(value) && value >= MIN_LONGITUDE && value <= MAX_LONGITUDE;
};

const isValidRadiusKm = (value) => {
    return Number.isFinite(value) && value > 0 && value <= MAX_RADIUS_KM;
};

module.exports = {
    MIN_LATITUDE,
    MAX_LATITUDE,
    MIN_LONGITUDE,
    MAX_LONGITUDE,
    MAX_RADIUS_KM,
    isValidLatitude,
    isValidLongitude,
    isValidRadiusKm
};
