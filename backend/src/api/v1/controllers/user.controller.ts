import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { formatSequelizeError } from '../../../utils/errorHandler.js';
import { normalizePhoneNumber } from '../../../utils/phone.js';
import jwt from 'jsonwebtoken';

/**
 * POST /users/register
 * Creates user + profile, generates and logs OTP to console.
 */
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { phoneNumber: rawPhone, role, fullName } = req.body;

        if (!rawPhone) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        const phoneNumber = normalizePhoneNumber(rawPhone);

        const user = await userService.createUser(phoneNumber, role ?? 'passenger', fullName);

        // Generate OTP → stored in Redis, queued via Bull (logs to console now, SMS later)
        await userService.generateAndSendOTP(phoneNumber);


        res.status(201).json({
            id: (user as any).dataValues?.id ?? user.id,
            phoneNumber,
            role,
            message: 'Registration successful. OTP sent.',
        });
    } catch (error: any) {
        console.error('[UserController] Registration error:', error);
        res.status(400).json({ error: formatSequelizeError(error) });
    }
};

/**
 * POST /users/verify-otp
 * Verifies the OTP entered by the user.
 */
export const verifyUserOTP = async (req: Request, res: Response) => {
    try {
        const { phoneNumber: rawPhone, otp } = req.body;

        if (!rawPhone || !otp) {
            res.status(400).json({ error: 'Phone number and OTP are required' });
            return;
        }

        const phoneNumber = normalizePhoneNumber(rawPhone);

        const valid = await userService.verifyOTP(phoneNumber, otp);

        if (!valid) {
            res.status(401).json({ error: 'Invalid or expired OTP. Please request a new code.' });
            return;
        }

        // Find the user to return their ID and data
        const user = await userService.findUserByPhone(phoneNumber);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, phoneNumber: user.phoneNumber, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({
            verified: true,
            userId: user.id,
            token,
            user,
            message: 'OTP verified successfully.',
        });
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};

/**
 * POST /users/resend-otp
 * Regenerates and logs a fresh OTP.
 */
export const resendOTP = async (req: Request, res: Response) => {
    try {
        const { phoneNumber: rawPhone } = req.body;
        if (!rawPhone) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        const phoneNumber = normalizePhoneNumber(rawPhone);

        await userService.generateAndSendOTP(phoneNumber);
        res.json({ message: 'New OTP generated. Check the backend console.' });
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};
