import { Router } from 'express';
import { createProfile, getProfile, updateKYC, submitVerification, getPendingProfiles } from '../controllers/profile.controller.js';
import { upload } from '../../../middleware/upload.middleware.js';

const router = Router();

router.post('/', createProfile);
router.get('/pending', getPendingProfiles); // Admin route
router.get('/:userId', getProfile);
router.put('/:userId/kyc', updateKYC);
router.post('/:userId/verify', upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), submitVerification);

export default router;
