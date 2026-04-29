import { Router } from 'express';
import { topupCredits, getBalance } from '../controllers/payment.controller.js';

const router = Router();

router.post('/topup', topupCredits);
router.get('/balance/:userId', getBalance);

export default router;
