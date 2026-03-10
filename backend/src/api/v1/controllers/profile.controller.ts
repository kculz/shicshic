import type { Request, Response } from 'express';
import * as profileService from '../services/profile.service.js';
import * as verificationService from '../services/verification.service.js';

export const createProfile = async (req: Request, res: Response) => {
    try {
        const { userId, fullName } = req.body;
        const profile = await profileService.createProfile(userId, fullName);
        res.status(201).json(profile);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.params['userId'] as string;
        const profile = await profileService.getProfileByUserId(userId);
        res.json(profile);
    } catch (error: any) {
        const status = error.message === 'Profile not found' ? 404 : 500;
        res.status(status).json({ error: error.message });
    }
};

export const updateKYC = async (req: Request, res: Response) => {
    try {
        const userId = req.params['userId'] as string;
        const { idCardFrontUrl, idCardBackUrl, selfieUrl } = req.body;
        const profile = await profileService.updateProfileKYC(userId, { idCardFrontUrl, idCardBackUrl, selfieUrl });
        res.json(profile);
    } catch (error: any) {
        const status = error.message === 'Profile not found' ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
};

export const submitVerification = async (req: Request, res: Response) => {
    try {
        const userId = req.params['userId'] as string;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files['idCardFront']?.[0] || !files['selfie']?.[0]) {
            return res.status(400).json({ error: 'ID Card front and Selfie are required' });
        }

        const idCardFrontUrl = files['idCardFront'][0].path;
        const selfieUrl = files['selfie'][0].path;

        const { profile, result } = await verificationService.processKYCUpdate(userId, {
            idCardFrontUrl,
            selfieUrl
        });

        res.json({
            message: result.recommendation === 'approve' ? 'KYC Auto-Approved' : 'KYC Pending Manual Review',
            profile,
            verification: result
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getPendingProfiles = async (req: Request, res: Response) => {
    try {
        const profiles = await profileService.getProfilesByStatus('pending');
        res.json(profiles);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
