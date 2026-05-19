import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { getCallSocket, disconnectCallSocket } from '../realtime/callSocket';
import type { TripCall } from '../types/call';

export const useIncomingCallWatcher = () => {
    const { isAuthenticated, token, user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const presentedCallRef = useRef<string | null>(null);

    const presentCall = useCallback((call: TripCall) => {
        const isReceiver = call.receiverId === user?.id;
        const isCaller = call.callerId === user?.id;
        if (!isReceiver && !isCaller) {
            return;
        }

        const onCallScreen = pathname === '/incoming-call' || pathname === '/calling';
        const contactName = isReceiver
            ? call.callerName || 'Ride contact'
            : call.receiverName || 'Ride contact';

        if (call.status === 'dialing' && isReceiver && !onCallScreen && presentedCallRef.current !== `incoming:${call.id}`) {
            presentedCallRef.current = `incoming:${call.id}`;
            router.push({
                pathname: '/incoming-call',
                params: {
                    callId: call.id,
                    tripId: call.tripId,
                    callerId: call.callerId,
                    callerName: contactName,
                },
            });
            return;
        }

        if (call.status === 'active' && !onCallScreen && presentedCallRef.current !== `active:${call.id}`) {
            presentedCallRef.current = `active:${call.id}`;
            router.push({
                pathname: '/calling',
                params: {
                    callId: call.id,
                    tripId: call.tripId,
                    contactName,
                },
            });
            return;
        }

        if (['ended', 'rejected', 'missed'].includes(call.status)) {
            presentedCallRef.current = null;
        }
    }, [pathname, router, user?.id]);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            presentedCallRef.current = null;
            disconnectCallSocket();
            return;
        }

        let isMounted = true;
        const socket = getCallSocket({ userId: user.id, token });

        const bootstrap = async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?userId=${user.id}`);
                const call = (res.data?.call ?? null) as TripCall | null;

                if (!isMounted || !call) {
                    return;
                }

                presentCall(call);
            } catch (error) {
                console.error('[CallWatcher] Failed to bootstrap active call', error);
            }
        };

        const handleIncomingCall = (payload: { call?: TripCall }) => {
            if (payload.call) {
                presentCall(payload.call);
            }
        };

        const handleCallUpdated = (payload: { call?: TripCall }) => {
            if (payload.call) {
                presentCall(payload.call);
            }
        };

        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:updated', handleCallUpdated);
        void bootstrap();

        return () => {
            isMounted = false;
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:updated', handleCallUpdated);
        };
    }, [isAuthenticated, presentCall, token, user?.id]);
};
