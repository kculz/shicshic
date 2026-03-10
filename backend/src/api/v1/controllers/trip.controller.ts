import type { Request, Response } from 'express';
import * as tripService from '../services/trip.service.js';

export const requestTrip = async (req: Request, res: Response) => {
    try {
        console.log('[TripController] New trip request received:', req.body);
        const { passengerId, pickupLocation, destinationLocation, isShared } = req.body;
        const trip = await tripService.createTrip({ passengerId, pickupLocation, destinationLocation, isShared });
        console.log('[TripController] Trip created successfully:', trip.id);
        res.status(201).json({ trip });
    } catch (error: any) {
        console.error('[TripController] Error requesting trip:', error.message);
        res.status(400).json({ error: error.message });
    }
};

export const getTrip = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const trip = await tripService.getTripById(id as string);
        res.json(trip);
    } catch (error: any) {
        const status = error.message === 'Trip not found' ? 404 : 500;
        res.status(status).json({ error: error.message });
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
        res.status(400).json({ error: error.message });
    }
};

export const listAvailableTrips = async (req: Request, res: Response) => {
    try {
        const trips = await tripService.getAvailableTrips();
        res.json(trips);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
