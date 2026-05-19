import type { Request, Response } from 'express';
import Call, { type CallIceCandidate, type CallSessionDescription } from '../../../database/models/Call.js';
import { Op } from 'sequelize';
import { emitCallUpdated, emitIncomingCall } from '../../../realtime/callSocket.js';

const isSessionDescription = (value: unknown): value is CallSessionDescription => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const maybeDescription = value as Record<string, unknown>;
    return typeof maybeDescription.type === 'string' && typeof maybeDescription.sdp === 'string';
};

const isIceCandidate = (value: unknown): value is CallIceCandidate => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const maybeCandidate = value as Record<string, unknown>;
    return typeof maybeCandidate.candidate === 'string';
};

export const initiateCall = async (req: Request, res: Response) => {
    try {
        const { tripId, callerId, receiverId, callerName, receiverName } = req.body;
        
        // Cancel any previous active calls for this trip
        await Call.update({ status: 'ended', endedAt: new Date() }, {
            where: {
                tripId,
                status: { [Op.in]: ['dialing', 'active'] }
            }
        });

        const call = await Call.create({
            tripId,
            callerId,
            receiverId,
            callerName: callerName || null,
            receiverName: receiverName || null,
            status: 'dialing',
            offerSdp: null,
            answerSdp: null,
            callerIceCandidates: [],
            receiverIceCandidates: [],
        });

        emitIncomingCall(call);
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

        await call.update({
            status,
            connectedAt: status === 'active' ? call.connectedAt ?? new Date() : call.connectedAt,
            endedAt: ['ended', 'rejected', 'missed'].includes(status) ? new Date() : call.endedAt,
        });
        emitCallUpdated(call);
        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const saveCallOffer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { offerSdp } = req.body;

        if (!isSessionDescription(offerSdp)) {
            res.status(400).json({ error: 'offerSdp is required' });
            return;
        }

        const call = await Call.findByPk(id as string);
        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        await call.update({ offerSdp });
        emitCallUpdated(call);
        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const saveCallAnswer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { answerSdp } = req.body;

        if (!isSessionDescription(answerSdp)) {
            res.status(400).json({ error: 'answerSdp is required' });
            return;
        }

        const call = await Call.findByPk(id as string);
        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        await call.update({ answerSdp });
        emitCallUpdated(call);
        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const appendCallCandidate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { participant, candidate } = req.body as {
            participant?: 'caller' | 'receiver';
            candidate?: CallIceCandidate;
        };

        if (!participant || !['caller', 'receiver'].includes(participant)) {
            res.status(400).json({ error: 'participant must be caller or receiver' });
            return;
        }

        if (!isIceCandidate(candidate)) {
            res.status(400).json({ error: 'candidate is required' });
            return;
        }

        const call = await Call.findByPk(id as string);
        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }

        const fieldName = participant === 'caller' ? 'callerIceCandidates' : 'receiverIceCandidates';
        const existingCandidates = participant === 'caller'
            ? call.callerIceCandidates ?? []
            : call.receiverIceCandidates ?? [];
        const candidateKey = JSON.stringify(candidate);

        if (!existingCandidates.some((item) => JSON.stringify(item) === candidateKey)) {
            await call.update({
                [fieldName]: [...existingCandidates, candidate],
            } as Partial<Call>);
        }

        emitCallUpdated(call);
        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getActiveCall = async (req: Request, res: Response) => {
    try {
        const { userId, callId } = req.query;

        if (!userId && !callId) {
            res.status(400).json({ error: 'userId or callId is required' });
            return;
        }

        const where = callId
            ? {
                id: callId as string,
                status: { [Op.in]: ['dialing', 'active'] }
            }
            : {
                [Op.or]: [
                    { callerId: userId as string },
                    { receiverId: userId as string }
                ],
                status: { [Op.in]: ['dialing', 'active'] }
            };

        const call = await Call.findOne({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json({ call });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
