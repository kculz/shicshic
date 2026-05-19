import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import type { TripCall } from '../types/call';

export const useIncomingCallWatcher = () => {
    const { isAuthenticated, user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const presentedCallRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            presentedCallRef.current = null;
            return;
        }

        let isMounted = true;

        const pollIncomingCalls = async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?userId=${user.id}`);
                const call = (res.data?.call ?? null) as TripCall | null;

                if (!isMounted) {
                    return;
                }

                if (!call) {
                    presentedCallRef.current = null;
                    return;
                }

                const isReceiver = call.receiverId === user.id;
                const isCaller = call.callerId === user.id;
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
                }
            } catch (error) {
                console.error('[CallWatcher] Failed to poll active call', error);
            }
        };

        void pollIncomingCalls();
        const interval = setInterval(() => {
            void pollIncomingCalls();
        }, 2000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [isAuthenticated, pathname, router, user?.id]);
};
