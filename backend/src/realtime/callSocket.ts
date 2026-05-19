import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '../api/v1/services/auth.service.js';
import type Call from '../database/models/Call.js';

type TokenPayload = {
    id?: string;
    role?: string;
};

let io: Server | null = null;

const getUserRoom = (userId: string) => `user:${userId}`;

const toBearerToken = (token: unknown) => {
    if (typeof token !== 'string' || !token.trim()) {
        return null;
    }

    return token.replace(/^Bearer\s+/i, '').trim();
};

const serializeCall = (call: Call) => {
    if (typeof call.toJSON === 'function') {
        return call.toJSON();
    }

    return call;
};

export const initializeCallSocket = (server: HttpServer) => {
    if (io) {
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = toBearerToken(socket.handshake.auth.token);
        const queryUserId = typeof socket.handshake.query.userId === 'string'
            ? socket.handshake.query.userId
            : null;
        const authUserId = typeof socket.handshake.auth.userId === 'string'
            ? socket.handshake.auth.userId
            : null;
        const requestedUserId = authUserId || queryUserId;

        if (token) {
            const payload = verifyToken(token) as TokenPayload | null;
            if (!payload?.id) {
                next(new Error('Unauthorized'));
                return;
            }

            if (requestedUserId && requestedUserId !== payload.id) {
                next(new Error('Unauthorized'));
                return;
            }

            socket.data.userId = payload.id;
            socket.data.role = payload.role;
            next();
            return;
        }

        if (!requestedUserId) {
            next(new Error('Unauthorized'));
            return;
        }

        socket.data.userId = requestedUserId;
        next();
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId as string | undefined;
        if (userId) {
            socket.join(getUserRoom(userId));
        }
    });

    return io;
};

export const emitIncomingCall = (call: Call) => {
    if (!io) {
        return;
    }

    const payload = { call: serializeCall(call) };
    io.to(getUserRoom(call.receiverId)).emit('call:incoming', payload);
    io.to(getUserRoom(call.callerId)).emit('call:updated', payload);
    io.to(getUserRoom(call.receiverId)).emit('call:updated', payload);
};

export const emitCallUpdated = (call: Call) => {
    if (!io) {
        return;
    }

    const payload = { call: serializeCall(call) };
    io.to(getUserRoom(call.callerId)).emit('call:updated', payload);
    io.to(getUserRoom(call.receiverId)).emit('call:updated', payload);
};
