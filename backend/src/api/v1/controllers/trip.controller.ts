import type { Request, Response } from 'express';
import * as tripService from '../services/trip.service.js';
import { formatSequelizeError } from '../../../utils/errorHandler.js';
import Profile from '../../../database/models/Profile.js';

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
        const trips = await tripService.getAvailableTrips();
        res.json(trips);
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};
