import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';

/**
 * POST /users/register
 * Creates user + profile, generates and logs OTP to console.
 */
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, role } = req.body;

        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        const user = await userService.createUser(phoneNumber, role ?? 'passenger');

        // Generate OTP → stored in Redis, queued via Bull (logs to console now, SMS later)
        await userService.generateAndSendOTP(phoneNumber);


        res.status(201).json({
            id: (user as any).dataValues?.id ?? user.id,
            phoneNumber,
            role,
            message: 'Registration successful. OTP sent.',
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * POST /users/verify-otp
 * Verifies the OTP entered by the user.
 */
export const verifyUserOTP = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            res.status(400).json({ error: 'Phone number and OTP are required' });
            return;
        }

        const valid = userService.verifyOTP(phoneNumber, otp);

        if (!valid) {
            res.status(401).json({ error: 'Invalid or expired OTP. Please request a new code.' });
            return;
        }

        // Find the user to return their ID
        const user = await userService.findUserByPhone(phoneNumber);

        res.json({
            verified: true,
            userId: user?.id ?? user?.dataValues?.id,
            message: 'OTP verified successfully.',
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /users/resend-otp
 * Regenerates and logs a fresh OTP.
 */
export const resendOTP = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        userService.generateAndSendOTP(phoneNumber);
        res.json({ message: 'New OTP generated. Check the backend console.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
