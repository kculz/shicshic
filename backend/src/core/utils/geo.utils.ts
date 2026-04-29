/**
 * Haversine formula to calculate the distance between two points on Earth in kilometers.
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Calculates the bearing between two points in degrees (0-360).
 */
export const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
    const x =
        Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
        Math.sin(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.cos((lon2 - lon1) * (Math.PI / 180));
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
};

/**
 * Checks if two bearings are heading in the same general direction.
 * @param bearing1 Bearing of first trip
 * @param bearing2 Bearing of second trip
 * @param tolerance Max degrees of difference (default 30)
 */
export const isHeadingSameDirection = (bearing1: number, bearing2: number, tolerance: number = 35): boolean => {
    const diff = Math.abs(bearing1 - bearing2);
    const normalizedDiff = diff > 180 ? 360 - diff : diff;
    return normalizedDiff <= tolerance;
};
