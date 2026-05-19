import type { Request, Response } from 'express';
import * as tripService from '../services/trip.service.js';
import { formatSequelizeError } from '../../../utils/errorHandler.js';
import Profile from '../../../database/models/Profile.js';
import Trip from '../../../database/models/Trip.js';
import { Op } from 'sequelize';
import Bid from '../../../database/models/Bid.js';
import User from '../../../database/models/User.js';

const ACTIVE_TRIP_STATUSES = ['accepted', 'en_route', 'boarding', 'in_progress'] as const;

const buildTripSession = async (trip: Trip | null) => {
    if (!trip) {
        return null;
    }

    const [acceptedBid, passengerUser, passengerProfile, driverUser, driverProfile] = await Promise.all([
        Bid.findOne({
            where: {
                tripId: trip.id,
                status: 'accepted',
            },
            order: [['updatedAt', 'DESC']],
        }),
        User.findByPk(trip.passengerId),
        Profile.findOne({ where: { userId: trip.passengerId } }),
        trip.driverId ? User.findByPk(trip.driverId) : Promise.resolve(null),
        trip.driverId ? Profile.findOne({ where: { userId: trip.driverId } }) : Promise.resolve(null),
    ]);

    return {
        id: trip.id,
        passengerId: trip.passengerId,
        driverId: trip.driverId ?? null,
        status: trip.status,
        pickupLocation: trip.pickupLocation,
        destinationLocation: trip.destinationLocation,
        pickupLat: Number(trip.pickupLat),
        pickupLon: Number(trip.pickupLon),
        destLat: Number(trip.destLat),
        destLon: Number(trip.destLon),
        fare: trip.fare !== null && trip.fare !== undefined ? Number(trip.fare) : null,
        isShared: Boolean(trip.isShared),
        seatsRequested: trip.seatsRequested,
        passengerName: passengerProfile?.fullName || 'Passenger',
        passengerPhone: passengerUser?.phoneNumber || '',
        driverName: acceptedBid?.driverName || driverProfile?.fullName || 'Driver',
        driverPhone: acceptedBid?.driverPhone || driverUser?.phoneNumber || '',
        driverRating: acceptedBid?.driverRating ?? null,
        vehicleMake: acceptedBid?.vehicleMake || driverProfile?.vehicleMake || '',
        vehicleModel: acceptedBid?.vehicleModel || driverProfile?.vehicleModel || '',
        vehiclePlate: acceptedBid?.vehiclePlate || driverProfile?.vehiclePlate || '',
        vehicleColor: acceptedBid?.vehicleColor || driverProfile?.vehicleColor || '',
        estimatedArrivalMins: acceptedBid?.estimatedArrivalMins ?? null,
        acceptedBidId: acceptedBid?.id ?? null,
        acceptedAt: acceptedBid?.updatedAt ?? trip.updatedAt,
        updatedAt: trip.updatedAt,
    };
};

export const requestTrip = async (req: Request, res: Response) => {
    try {
        console.log('[TripController] New trip request received:', req.body);
        const { 
            passengerId, 
            pickupLocation, 
            destinationLocation, 
            pickupLat, 
            pickupLon, 
            destLat, 
            destLon, 
            isShared,
            seatsRequested
        } = req.body;
 
        // Profile verification check
        const profile = await Profile.findOne({ where: { userId: passengerId } });
        if (!profile || !profile.fullName) {
            res.status(403).json({ 
                error: 'Incomplete Profile', 
                message: 'You must set your full name in your profile before requesting a ride.' 
            });
            return;
        }

        const trip = await tripService.createTrip({ 
            passengerId, 
            pickupLocation, 
            destinationLocation, 
            pickupLat: Number(pickupLat),
            pickupLon: Number(pickupLon),
            destLat: Number(destLat),
            destLon: Number(destLon),
            isShared,
            seatsRequested: seatsRequested || 1
        });

        console.log('[TripController] Trip created successfully:', trip.id, isShared ? `(Pool: ${trip.poolId})` : '');
        res.status(201).json({ trip });
    } catch (error: any) {
        console.error('[TripController] Error requesting trip:', error);
        res.status(400).json({ error: formatSequelizeError(error) });
    }
};

export const getTrip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const trip = await tripService.getTripById(id as string);
        res.json(trip);
    } catch (error: any) {
        const status = error.message === 'Trip not found' ? 404 : 500;
        res.status(status).json({ error: formatSequelizeError(error) });
    }
};

export const getTripSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const trip = await tripService.getTripById(id as string);
        const session = await buildTripSession(trip);
        res.json({ trip: session });
    } catch (error: any) {
        const status = error.message === 'Trip not found' ? 404 : 500;
        res.status(status).json({ error: formatSequelizeError(error) });
    }
};

export const acceptTrip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { driverId } = req.body;
        // In a real app we'd also verify the driver exists and is approved
        const trip = await tripService.updateTripStatus(id as string, 'accepted');
        await trip.update({ driverId });
        res.json(trip);
    } catch (error: any) {
        res.status(400).json({ error: formatSequelizeError(error) });
    }
};

export const listAvailableTrips = async (req: Request, res: Response) => {
    try {
        const { lat, lon, driverId } = req.query;
        
        let radius = 5;
        if (driverId) {
            const profile = await Profile.findOne({ where: { userId: driverId as string } });
            if (profile) radius = profile.searchRadius || 5;
        }

        const trips = await tripService.getAvailableTrips(
            lat ? Number(lat) : undefined, 
            lon ? Number(lon) : undefined,
            radius
        );
        res.json(trips);
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};

export const getActiveTrip = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        const trip = await Trip.findOne({
            where: {
                [Op.or]: [
                    { passengerId: userId as string },
                    { driverId: userId as string }
                ],
                status: { [Op.in]: ACTIVE_TRIP_STATUSES }
            },
            order: [['updatedAt', 'DESC']]
        });

        res.json(trip);
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};

export const getActiveTripSession = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        const trip = await Trip.findOne({
            where: {
                [Op.or]: [
                    { passengerId: userId as string },
                    { driverId: userId as string }
                ],
                status: { [Op.in]: ACTIVE_TRIP_STATUSES }
            },
            order: [['updatedAt', 'DESC']]
        });

        const session = await buildTripSession(trip);
        res.json({ trip: session });
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};
