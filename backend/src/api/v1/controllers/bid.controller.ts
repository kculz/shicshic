import type { Request, Response } from 'express';
import Bid from '../../../database/models/Bid.js';
import Trip from '../../../database/models/Trip.js';
import ChatMessage from '../../../database/models/ChatMessage.js';

// ─── Mock driver pool (replace with real drivers from User table later) ─────
const MOCK_DRIVERS = [
    { driverId: 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', driverName: 'Tinashe Moyo', driverPhone: '+263775001234', driverRating: 4.9, vehicleMake: 'Toyota Vitz', vehiclePlate: 'ABC 1234', estimatedArrivalMins: 3 },
    { driverId: 'b2c3d4e5-f6a1-4b5c-c6d7-e8f9a0b1c2d3', driverName: 'Chido Mabika', driverPhone: '+263779005678', driverRating: 4.7, vehicleMake: 'Honda Fit', vehiclePlate: 'XYZ 5678', estimatedArrivalMins: 6 },
    { driverId: 'c3d4e5f6-a1b2-4c5d-d6e7-f8a9b0c1d2e3', driverName: 'Brian Dube', driverPhone: '+263712009999', driverRating: 4.8, vehicleMake: 'Mazda Demio', vehiclePlate: 'DEF 9012', estimatedArrivalMins: 8 },
];

/**
 * GET /trips/fare-estimate
 * Returns a suggested fare range based on distance.
 * Uses a simple USD-per-km model for Zimbabwe.
 */
export const getFareEstimate = async (req: Request, res: Response) => {
    try {
        const { distanceKm } = req.query;
        const km = parseFloat(String(distanceKm || 5));

        // Zimbabwe ride-hail pricing model: base $1 + $0.35/km
        const base = 1.0;
        const perKm = 0.35;
        const suggested = parseFloat((base + km * perKm).toFixed(2));
        const low = parseFloat((suggested * 0.85).toFixed(2));
        const high = parseFloat((suggested * 1.25).toFixed(2));

        res.json({
            suggested,
            low,
            high,
            currency: 'USD',
            note: 'Based on typical ShicShic fares in Harare',
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /trips/:id/bids/simulate
 * Simulates nearby drivers placing bids on a trip.
 * In production this would be triggered by the driver app.
 */
export const simulateDriverBids = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.id as string;
        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            console.warn('[BidSim] Trip not found:', tripId);
            res.status(404).json({ error: 'Trip not found' });
            return;
        }

        const { passengerFare } = req.body as { passengerFare: number };
        console.log(`[BidSim] Simulating bids for trip ${tripId} with passenger fare: ${passengerFare}`);

        // Simulate 2-3 drivers bidding around the passenger's offer
        const bids = await Promise.all(
            MOCK_DRIVERS.slice(0, 3).map(async (driver, i) => {
                // Drivers offer within ±15% of passenger's offer
                const variance = 1 + (i === 0 ? 0 : i === 1 ? 0.1 : -0.05);
                const offeredFare = parseFloat((passengerFare * variance).toFixed(2));

                return Bid.create({
                    tripId,
                    ...driver,
                    offeredFare,
                    currency: 'USD',
                    status: 'pending',
                });
            })
        );

        res.json({ bids: bids.map(b => (b as any).dataValues ?? b) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /trips/:id/bids
 * Returns all pending bids for a trip.
 */
export const getTripBids = async (req: Request, res: Response) => {
    try {
        const { id: tripId } = req.params;
        const bids = await Bid.findAll({
            where: { tripId, status: 'pending' },
            order: [['createdAt', 'ASC']],
        });
        res.json({ bids: bids.map(b => (b as any).dataValues ?? b) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /trips/:id/bids/:bidId/accept
 * Passenger accepts a specific driver's bid.
 */
export const acceptBid = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.id as string;
        const bidId = req.params.bidId as string;

        const bid = await Bid.findByPk(bidId);
        if (!bid) { res.status(404).json({ error: 'Bid not found' }); return; }

        // Accept this bid
        await bid.update({ status: 'accepted' });

        // Reject all others for this trip
        await Bid.update({ status: 'rejected' }, { where: { tripId, status: 'pending' } });

        // Update trip with accepted driver and fare
        await Trip.update(
            {
                driverId: bid.driverId,
                fare: bid.offeredFare,
                status: 'accepted',
            },
            { where: { id: tripId } }
        );

        res.json({
            message: 'Driver accepted. Ride confirmed!',
            bid: (bid as any).dataValues ?? bid,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /trips/:id/bids/:bidId/reject
 * Passenger rejects a specific driver's bid.
 */
export const rejectBid = async (req: Request, res: Response) => {
    try {
        const { bidId } = req.params;
        await Bid.update({ status: 'rejected' }, { where: { id: bidId } });
        res.json({ message: 'Driver rejected' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * GET /trips/:id/messages
 * Returns all chat messages for a trip.
 */
export const getChatMessages = async (req: Request, res: Response) => {
    try {
        const { id: tripId } = req.params;
        const messages = await ChatMessage.findAll({
            where: { tripId },
            order: [['createdAt', 'ASC']],
        });
        res.json({ messages: messages.map(m => (m as any).dataValues ?? m) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /trips/:id/messages
 * Sends a chat message on a trip thread.
 */
export const sendChatMessage = async (req: Request, res: Response) => {
    try {
        const tripId = req.params.id as string;
        const { senderId, senderRole, senderName, message } = req.body;

        if (!message?.trim()) { res.status(400).json({ error: 'Message cannot be empty' }); return; }

        const msg = await ChatMessage.create({ tripId, senderId, senderRole, senderName, message: message.trim() });
        res.status(201).json({ message: (msg as any).dataValues ?? msg });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
