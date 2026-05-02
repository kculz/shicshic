import type { Request, Response } from 'express';
import Call from '../../../database/models/Call.js';
import { Op } from 'sequelize';

export const initiateCall = async (req: Request, res: Response) => {
    try {
        const { tripId, callerId, receiverId } = req.body;
        
        // Cancel any previous active calls for this trip
        await Call.update({ status: 'ended' }, {
            where: {
                tripId,
                status: { [Op.in]: ['dialing', 'active'] }
            }
        });

        const call = await Call.create({
            tripId,
            callerId,
            receiverId,
            status: 'dialing'
        });

        res.status(201).json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCallStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const call = await Call.findByPk(id as string);
        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        await call.update({ status });
        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getActiveCall = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        
        const call = await Call.findOne({
            where: {
                [Op.or]: [
                    { callerId: userId as string },
                    { receiverId: userId as string }
                ],
                status: { [Op.in]: ['dialing', 'active'] }
            },
            order: [['createdAt', 'DESC']]
        });

        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
