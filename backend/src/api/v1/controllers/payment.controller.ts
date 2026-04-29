import type { Request, Response } from 'express';
import User from '../../../database/models/User.js';
import Transaction from '../../../database/models/Transaction.js';
import * as ecocashService from '../services/ecocash.service.js';
import { formatSequelizeError } from '../../../utils/errorHandler.js';

export const topupCredits = async (req: Request, res: Response) => {
    try {
        const { userId, amount, phoneNumber } = req.body;

        if (!userId || !amount || !phoneNumber) {
            res.status(400).json({ error: 'userId, amount, and phoneNumber are required' });
            return;
        }

        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // 1. Initiate EcoCash payment
        const ecocashRes = await ecocashService.initiatePayment(phoneNumber, amount);

        // 2. Create pending transaction
        const transaction = await Transaction.create({
            userId,
            amount,
            type: 'topup',
            status: 'pending',
            reference: ecocashRes.reference,
            metadata: JSON.stringify(ecocashRes)
        });

        // 3. Simulate immediate success for demo purposes
        // In reality, this would happen via a webhook or polling
        setTimeout(async () => {
            await transaction.update({ status: 'completed' });
            await user.increment('credits', { by: amount });
            console.log(`[Payment] User ${userId} balance updated by $${amount}`);
        }, 5000);

        res.json({
            message: 'Payment initiated. Please confirm on your phone.',
            transactionId: transaction.id,
            ecocash: ecocashRes
        });
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};

export const getBalance = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ credits: user.credits });
    } catch (error: any) {
        res.status(500).json({ error: formatSequelizeError(error) });
    }
};
