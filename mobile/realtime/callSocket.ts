import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from '../api/client';

let socket: Socket | null = null;
let activeUserId: string | null = null;
let activeToken: string | null = null;

interface ConnectSocketOptions {
    userId: string;
    token?: string | null;
}

export const getCallSocket = ({ userId, token }: ConnectSocketOptions) => {
    const normalizedToken = token?.trim() || null;

    if (socket && activeUserId === userId && activeToken === normalizedToken) {
        if (!socket.connected) {
            socket.connect();
        }

        return socket;
    }

    if (socket) {
        socket.disconnect();
    }

    socket = io(API_ORIGIN, {
        transports: ['websocket'],
        autoConnect: false,
        auth: {
            userId,
            token: normalizedToken ? `Bearer ${normalizedToken}` : undefined,
        },
    });

    activeUserId = userId;
    activeToken = normalizedToken;
    socket.connect();

    return socket;
};

export const disconnectCallSocket = () => {
    if (socket) {
        socket.disconnect();
    }

    socket = null;
    activeUserId = null;
    activeToken = null;
};
