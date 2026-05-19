import { Router } from 'express';
import { requestTrip, getTrip, getTripSession, acceptTrip, listAvailableTrips, getActiveTrip, getActiveTripSession } from '../controllers/trip.controller.js';
import { getFareEstimate, simulateDriverBids, getTripBids, acceptBid, rejectBid, getChatMessages, sendChatMessage, placeBid } from '../controllers/bid.controller.js';
import { appendCallCandidate, getActiveCall, initiateCall, saveCallAnswer, saveCallOffer, updateCallStatus } from '../controllers/call.controller.js';

const router = Router();

router.post('/request', requestTrip);
router.get('/fare-estimate', getFareEstimate);
router.get('/available', listAvailableTrips);
router.get('/active', getActiveTrip);
router.get('/active-session', getActiveTripSession);
router.get('/:id', getTrip);
router.get('/:id/session', getTripSession);
router.post('/:id/accept', acceptTrip);

// Bidding
router.post('/:id/bids', placeBid);
router.post('/:id/bids/simulate', simulateDriverBids);
router.get('/:id/bids', getTripBids);
router.post('/:id/bids/:bidId/accept', acceptBid);
router.post('/:id/bids/:bidId/reject', rejectBid);

// Chat
router.get('/:id/messages', getChatMessages);
router.post('/:id/messages', sendChatMessage);

// Calls
router.post('/calls', initiateCall);
router.get('/calls/active', getActiveCall);
router.post('/calls/:id/offer', saveCallOffer);
router.post('/calls/:id/answer', saveCallAnswer);
router.post('/calls/:id/candidates', appendCallCandidate);
router.patch('/calls/:id', updateCallStatus);

export default router;
