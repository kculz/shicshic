import User from '../../../database/models/User.js';
import Profile from '../../../database/models/Profile.js';
import { otpQueue, storeOtpInRedis, getAndConsumeOtp } from '../../../queues/otp.queue.js';

/**
 * Generates a 6-digit OTP, stores it in Redis (via Bull),
 * and queues a send job (console log for now, SMS later).
 */
export const generateAndSendOTP = async (phoneNumber: string): Promise<string> => {
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in Redis with 10-minute TTL
    await storeOtpInRedis(phoneNumber, otp);

    // Queue the send job (Bull processor handles logging / later SMS)
    await otpQueue.add(
        { phoneNumber, otp, channel: 'sms' },
        {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
        }
    );

    return otp;
};

/**
 * Verifies and consumes a Redis-stored OTP.
 * Returns true if the OTP is correct and not expired.
 */
export const verifyOTP = async (phoneNumber: string, otp: string): Promise<boolean> => {
    const stored = await getAndConsumeOtp(phoneNumber);
    if (!stored) return false;
    return stored === otp;
};

export const createUser = async (phoneNumber: string, role: 'passenger' | 'driver') => {
    const user = await User.create({ phoneNumber, role });
    const userId = user.id || (user as any).dataValues?.id;

    if (userId) {
        await Profile.create({ userId });
    } else {
        console.error('[UserService] Failed to get user ID after creation, profile not created');
    }

    return user;
};

export const findUserByPhone = async (phoneNumber: string) => {
    return await User.findOne({ where: { phoneNumber } }) as any;
};

export const getAllUsers = async () => {
    return await User.findAll();
};
