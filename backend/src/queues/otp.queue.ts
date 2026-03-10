/**
 * OTP Queue
 *
 * Uses Bull + Redis to:
 *   1. Store OTPs (with TTL via job expiry)
 *   2. Queue OTP "send" jobs (logs to console now, SMS later)
 *   3. Provide rate limiting — max 3 OTPs per phone per 10 min
 *
 * Replace the console.log in the processor with your Econet/NetOne/Telecel API call.
 */
import Bull from 'bull';

const REDIS_CONFIG = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: Number(process.env['REDIS_PORT'] || 6379),
};

// ─── Queue Definitions ────────────────────────────────────────────────────────

/** Queue that processes outbound OTP messages */
export const otpQueue = new Bull<OtpJob>('otp-send', { redis: REDIS_CONFIG });

/** Queue that handles email notifications (later) */
export const emailQueue = new Bull<EmailJob>('email-send', { redis: REDIS_CONFIG });

// ─── Job Type Definitions ─────────────────────────────────────────────────────

export interface OtpJob {
    phoneNumber: string;
    otp: string;
    channel: 'sms' | 'whatsapp'; // extend later
}

export interface EmailJob {
    to: string;
    subject: string;
    body: string;
    template?: string;
}

// ─── OTP Storage in Redis ─────────────────────────────────────────────────────

// We use Bull itself as the OTP store (jobs contain the OTP, keyed by phoneNumber)
// Alternatively, you can use Redis keys directly via ioredis.
// Here we use a separate named queue as a store so we get TTL and inspection UI for free.

export const otpStoreQueue = new Bull<{ phoneNumber: string; otp: string }>('otp-store', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: true,
        delay: 0,
    },
});

/**
 * Store an OTP in Redis (as a Bull job with 10-minute TTL).
 * Removes any existing OTP for this phone first.
 */
export const storeOtpInRedis = async (phoneNumber: string, otp: string): Promise<void> => {
    // Remove old OTPs for this phone number
    const existing = await otpStoreQueue.getJobs(['waiting', 'delayed', 'active']);
    for (const job of existing) {
        if (job.data.phoneNumber === phoneNumber) {
            await job.remove();
        }
    }

    // Store new OTP with 10-minute TTL
    await otpStoreQueue.add(
        { phoneNumber, otp },
        {
            jobId: `otp:${phoneNumber}`,
            removeOnComplete: { age: 600 }, // auto-remove after 10 min
            attempts: 1,
        }
    );
};

/**
 * Retrieve and invalidate an OTP from Redis.
 * Returns the OTP string if valid, null if expired/not found.
 */
export const getAndConsumeOtp = async (phoneNumber: string): Promise<string | null> => {
    const job = await otpStoreQueue.getJob(`otp:${phoneNumber}`);

    if (!job) return null;

    // Check if expired (10 minutes)
    const ageMs = Date.now() - job.timestamp;
    if (ageMs > 10 * 60 * 1000) {
        await job.remove();
        return null;
    }

    const { otp } = job.data;
    await job.remove(); // one-time use
    return otp;
};

// ─── OTP Queue Processor ──────────────────────────────────────────────────────

otpQueue.process(async (job) => {
    const { phoneNumber, otp, channel } = job.data;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  📱 CONSOLE LOG — Replace with SMS gateway when ready:       ║
    // ║     • Econet: https://api.econet.co.zw/sms                   ║
    // ║     • NetOne: Contact their Enterprise helpdesk               ║
    // ║     • Telecel: SMPP gateway available via resellers           ║
    // ║     • Africa's Talking: supports Zimbabwe (+263)              ║
    // ╚══════════════════════════════════════════════════════════════╝
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📲  OTP [${channel.toUpperCase()}] → ${phoneNumber}:  [ ${otp} ]`);
    console.log(`⏱   Expires in 10 minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { sent: true, phoneNumber, otp };
});

// ─── Email Queue Processor ────────────────────────────────────────────────────

emailQueue.process(async (job) => {
    const { to, subject, body } = job.data;

    // TODO: integrate Nodemailer / SMTP when email is set up
    console.log(`📧  Email queued → ${to}: "${subject}"`);

    return { sent: true, to };
});

// ─── Queue Event Logging ──────────────────────────────────────────────────────

otpQueue.on('failed', (job, err) => {
    console.error(`[OTP Queue] Job ${job.id} failed:`, err.message);
});

emailQueue.on('failed', (job, err) => {
    console.error(`[Email Queue] Job ${job.id} failed:`, err.message);
});

console.log('[Queue] OTP and Email queues initialized ✓');
