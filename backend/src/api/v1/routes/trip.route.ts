import { Router } from 'express';
import { requestTrip, getTrip, acceptTrip, listAvailableTrips } from '../controllers/trip.controller.js';
import { getFareEstimate, simulateDriverBids, getTripBids, acceptBid, rejectBid, getChatMessages, sendChatMessage } from '../controllers/bid.controller.js';

const router = Router();

router.post('/request', requestTrip);
router.get('/fare-estimate', getFareEstimate);
router.get('/available', listAvailableTrips);
router.get('/:id', getTrip);
router.post('/:id/accept', acceptTrip);

// Bidding
router.post('/:id/bids/simulate', simulateDriverBids);
router.get('/:id/bids', getTripBids);
router.post('/:id/bids/:bidId/accept', acceptBid);
router.post('/:id/bids/:bidId/reject', rejectBid);

// Chat
router.get('/:id/messages', getChatMessages);
router.post('/:id/messages', sendChatMessage);

export default router;
