import Trip from '../../../database/models/Trip.js';
import { v4 as uuidv4 } from 'uuid';
import { getDistance, getBearing, isHeadingSameDirection } from '../../../core/utils/geo.utils.js';
import { Op } from 'sequelize';

export const createTrip = async (data: {
    passengerId: string;
    pickupLocation: string;
    destinationLocation: string;
    pickupLat: number;
    pickupLon: number;
    destLat: number;
    destLon: number;
    isShared?: boolean;
    seatsRequested?: number;
}) => {
    let poolId = null;

    if (data.isShared) {
        // Try to find a compatible pool
        const match = await findCompatiblePool(
            data.pickupLat,
            data.pickupLon,
            data.destLat,
            data.destLon,
            data.seatsRequested || 1
        );
        if (match) {
            poolId = match.poolId;
            console.log(`[TripService] Found compatible pool: ${poolId}`);
        } else {
            poolId = uuidv4();
            console.log(`[TripService] Starting new pool: ${poolId}`);
        }
    }

    return await Trip.create({
        ...data,
        poolId,
        status: 'requested'
    });
};

export const findCompatiblePool = async (
    pickupLat: number,
    pickupLon: number,
    destLat: number,
    destLon: number,
    seatsNeeded: number
) => {
    // 1. Find active shared trips that are still in "requested" or "accepted" (not yet boarding/in_progress)
    const activeTrips = await Trip.findAll({
        where: {
            isShared: true,
            status: { [Op.in]: ['requested', 'accepted'] },
        }
    });

    if (activeTrips.length === 0) return null;

    // 2. Calculate bearing of the new request
    const newBearing = getBearing(pickupLat, pickupLon, destLat, destLon);

    // 3. Group by poolId and check compatibility
    // In a production app, we'd use a spatial index/query. Here we iterate.
    const poolInfo: Record<string, { totalSeats: number; firstTrip: Trip }> = {};

    for (const trip of activeTrips) {
        const pid = trip.poolId || trip.id; // If trip has no poolId yet, it's a potential pool leader
        if (!poolInfo[pid]) {
            poolInfo[pid] = { totalSeats: 0, firstTrip: trip };
        }
        poolInfo[pid].totalSeats += trip.seatsRequested;
    }

    for (const pid in poolInfo) {
        const { totalSeats, firstTrip } = poolInfo[pid];

        // Check capacity
        if (totalSeats + seatsNeeded > firstTrip.maxSeats) continue;

        // Check pickup proximity (within 2.5km)
        const dist = getDistance(pickupLat, pickupLon, Number(firstTrip.pickupLat), Number(firstTrip.pickupLon));
        if (dist > 2.5) continue;

        // Check direction compatibility
        const poolBearing = getBearing(
            Number(firstTrip.pickupLat),
            Number(firstTrip.pickupLon),
            Number(firstTrip.destLat),
            Number(firstTrip.destLon)
        );

        if (isHeadingSameDirection(newBearing, poolBearing)) {
            // Match found!
            // If the first trip didn't have a poolId, we need to give it one
            if (!firstTrip.poolId) {
                await firstTrip.update({ poolId: pid });
            }
            return { poolId: pid };
        }
    }

    return null;
};

export const getTripById = async (id: string) => {
    const trip = await Trip.findByPk(id);
    if (!trip) throw new Error('Trip not found');
    return trip;
};

export const updateTripStatus = async (id: string, status: Trip['status']) => {
    const trip = await getTripById(id);
    return await trip.update({ status });
};

export const getAvailableTrips = async () => {
    // For shared trips, we might want to return them grouped or unique per pool
    return await Trip.findAll({ where: { status: 'requested' } });
};
