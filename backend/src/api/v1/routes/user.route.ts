import { Router } from 'express';
import { registerUser, getUsers, verifyUserOTP, resendOTP } from '../controllers/user.controller.js';

const router = Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyUserOTP);
router.post('/resend-otp', resendOTP);
router.get('/', getUsers);

export default router;
