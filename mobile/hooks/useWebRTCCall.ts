import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    mediaDevices,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    type MediaStream,
} from 'react-native-webrtc';
import apiClient from '../api/client';
import { getCallSocket } from '../realtime/callSocket';
import { useAuthStore } from '../store/useAuthStore';
import type { TripCall, TripCallIceCandidate, TripCallParticipant, TripCallStatus } from '../types/call';

type CallPhase = 'idle' | 'preparing' | 'dialing' | 'connecting' | 'active' | 'ended' | 'error';

interface UseWebRTCCallOptions {
    callId: string | null;
    participant: TripCallParticipant | null;
    enabled: boolean;
    onEnded?: () => void;
}

interface UseWebRTCCallResult {
    call: TripCall | null;
    phase: CallPhase;
    localReady: boolean;
    remoteAudioReady: boolean;
    isMuted: boolean;
    toggleMute: () => void;
    endCall: (status?: TripCallStatus) => Promise<void>;
}

const SESSION_CONSTRAINTS = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
    voiceActivityDetection: true,
};

const getIceServers = () => {
    const turnUrls = process.env.EXPO_PUBLIC_WEBRTC_TURN_URLS
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const turnUsername = process.env.EXPO_PUBLIC_WEBRTC_TURN_USERNAME;
    const turnCredential = process.env.EXPO_PUBLIC_WEBRTC_TURN_CREDENTIAL;

    const servers: Array<{
        urls: string | string[];
        username?: string;
        credential?: string;
    }> = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUrls?.length && turnUsername && turnCredential) {
        servers.push({
            urls: turnUrls,
            username: turnUsername,
            credential: turnCredential,
        });
    }

    return servers;
};

export const useWebRTCCall = ({
    callId,
    participant,
    enabled,
    onEnded,
}: UseWebRTCCallOptions): UseWebRTCCallResult => {
    const { token, user } = useAuthStore();
    const [call, setCall] = useState<TripCall | null>(null);
    const [phase, setPhase] = useState<CallPhase>('idle');
    const [localReady, setLocalReady] = useState(false);
    const [remoteAudioReady, setRemoteAudioReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingRemoteCandidatesRef = useRef<RTCIceCandidate[]>([]);
    const seenRemoteCandidatesRef = useRef<Set<string>>(new Set());
    const localOfferSentRef = useRef(false);
    const localAnswerSentRef = useRef(false);
    const remoteDescriptionSetRef = useRef(false);
    const activeStatusSyncedRef = useRef(false);
    const shuttingDownRef = useRef(false);
    const onEndedRef = useRef(onEnded);

    onEndedRef.current = onEnded;

    const canStart = Boolean(callId && participant && enabled && user?.id);
    const iceServers = useMemo(() => getIceServers(), []);

    const closeTransport = useCallback(() => {
        const peer = peerRef.current;
        if (peer) {
            try {
                peer.close();
            } catch (error) {
                console.error('[WebRTC] Failed to close peer', error);
            }
        }

        const localStream = localStreamRef.current;
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch (error) {
                    console.error('[WebRTC] Failed to stop local track', error);
                }
            });
        }

        peerRef.current = null;
        localStreamRef.current = null;
        pendingRemoteCandidatesRef.current = [];
        seenRemoteCandidatesRef.current.clear();
        localOfferSentRef.current = false;
        localAnswerSentRef.current = false;
        remoteDescriptionSetRef.current = false;
        activeStatusSyncedRef.current = false;
        shuttingDownRef.current = false;
        setLocalReady(false);
        setRemoteAudioReady(false);
        setIsMuted(false);
    }, []);

    const syncActiveStatus = useCallback(async () => {
        if (!callId || activeStatusSyncedRef.current) {
            return;
        }

        activeStatusSyncedRef.current = true;
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'active' });
        } catch (error) {
            activeStatusSyncedRef.current = false;
            console.error('[WebRTC] Failed to sync active call state', error);
        }
    }, [callId]);

    const flushPendingRemoteCandidates = useCallback(async () => {
        const peer = peerRef.current;
        if (!peer?.remoteDescription) {
            return;
        }

        const pendingCandidates = [...pendingRemoteCandidatesRef.current];
        pendingRemoteCandidatesRef.current = [];

        for (const candidate of pendingCandidates) {
            try {
                await peer.addIceCandidate(candidate);
            } catch (error) {
                console.error('[WebRTC] Failed to apply queued ICE candidate', error);
            }
        }
    }, []);

    const applyRemoteCandidate = useCallback(async (candidate: TripCallIceCandidate) => {
        const peer = peerRef.current;
        if (!peer) {
            return;
        }

        const candidateKey = JSON.stringify(candidate);
        if (seenRemoteCandidatesRef.current.has(candidateKey)) {
            return;
        }

        seenRemoteCandidatesRef.current.add(candidateKey);
        const rtcCandidate = new RTCIceCandidate(candidate);

        if (!peer.remoteDescription) {
            pendingRemoteCandidatesRef.current.push(rtcCandidate);
            return;
        }

        try {
            await peer.addIceCandidate(rtcCandidate);
        } catch (error) {
            console.error('[WebRTC] Failed to add remote ICE candidate', error);
        }
    }, []);

    const ensurePeer = useCallback(async () => {
        if (!callId || !participant) {
            return;
        }

        if (peerRef.current) {
            return;
        }

        setPhase((current) => (current === 'idle' ? 'preparing' : current));

        const localStream = await mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });

        localStreamRef.current = localStream;
        setLocalReady(true);

        const peer = new RTCPeerConnection({ iceServers });
        peerRef.current = peer;
        const peerEvents = peer as RTCPeerConnection & {
            onicecandidate?: (event: { candidate: RTCIceCandidate | null }) => void;
            ontrack?: (event: { streams: MediaStream[] }) => void;
            onconnectionstatechange?: () => void;
            oniceconnectionstatechange?: () => void;
        };

        peerEvents.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
            if (!event.candidate || shuttingDownRef.current) {
                return;
            }

            void apiClient.post(`/trips/calls/${callId}/candidates`, {
                participant,
                candidate: {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                },
            }).catch((error) => {
                console.error('[WebRTC] Failed to send ICE candidate', error);
            });
        };

        peerEvents.ontrack = (event: { streams: MediaStream[] }) => {
            if (event.streams[0]) {
                setRemoteAudioReady(true);
            }
        };

        peerEvents.onconnectionstatechange = () => {
            const state = peer.connectionState;
            if (state === 'connected') {
                setPhase('active');
                void syncActiveStatus();
                return;
            }

            if (state === 'connecting') {
                setPhase('connecting');
                return;
            }

            if (state === 'disconnected' || state === 'failed') {
                setPhase('error');
            }
        };

        peerEvents.oniceconnectionstatechange = () => {
            const state = peer.iceConnectionState;
            if (state === 'connected' || state === 'completed') {
                setRemoteAudioReady(true);
                setPhase('active');
                void syncActiveStatus();
                return;
            }

            if (state === 'checking') {
                setPhase('connecting');
                return;
            }

            if (state === 'failed' || state === 'disconnected') {
                setPhase('error');
            }
        };

        localStream.getTracks().forEach((track) => {
            peer.addTrack(track, localStream);
        });
    }, [callId, iceServers, participant, syncActiveStatus]);

    const applyCallSnapshot = useCallback(async (nextCall: TripCall) => {
        await ensurePeer();

        const peer = peerRef.current;
        if (!peer || !participant) {
            return;
        }

        if (participant === 'caller') {
            if (!localOfferSentRef.current) {
                const offerDescription = await peer.createOffer(SESSION_CONSTRAINTS);
                await peer.setLocalDescription(offerDescription);
                await apiClient.post(`/trips/calls/${nextCall.id}/offer`, { offerSdp: offerDescription });
                localOfferSentRef.current = true;
                setPhase('dialing');
            }

            if (nextCall.answerSdp && !remoteDescriptionSetRef.current) {
                await peer.setRemoteDescription(new RTCSessionDescription(nextCall.answerSdp));
                remoteDescriptionSetRef.current = true;
                await flushPendingRemoteCandidates();
                setPhase('connecting');
            }

            for (const candidate of nextCall.receiverIceCandidates ?? []) {
                await applyRemoteCandidate(candidate);
            }
        } else {
            if (nextCall.offerSdp && !remoteDescriptionSetRef.current) {
                await peer.setRemoteDescription(new RTCSessionDescription(nextCall.offerSdp));
                remoteDescriptionSetRef.current = true;
                await flushPendingRemoteCandidates();
            }

            for (const candidate of nextCall.callerIceCandidates ?? []) {
                await applyRemoteCandidate(candidate);
            }

            if (remoteDescriptionSetRef.current && !localAnswerSentRef.current) {
                const answerDescription = await peer.createAnswer();
                await peer.setLocalDescription(answerDescription);
                await apiClient.post(`/trips/calls/${nextCall.id}/answer`, { answerSdp: answerDescription });
                localAnswerSentRef.current = true;
                setPhase('connecting');
            }
        }

        setPhase((current) => {
            if (nextCall.status === 'active') {
                return 'active';
            }

            if (current === 'idle' || current === 'preparing') {
                return participant === 'caller' ? 'dialing' : 'connecting';
            }

            return current;
        });
    }, [applyRemoteCandidate, ensurePeer, flushPendingRemoteCandidates, participant]);

    const handleEndedCall = useCallback(() => {
        closeTransport();
        setCall(null);
        setPhase('ended');
        onEndedRef.current?.();
    }, [closeTransport]);

    const endCall = useCallback(async (status: TripCallStatus = 'ended') => {
        if (!callId || shuttingDownRef.current) {
            closeTransport();
            setPhase('ended');
            return;
        }

        shuttingDownRef.current = true;
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status });
        } catch (error) {
            console.error('[WebRTC] Failed to end call', error);
        } finally {
            closeTransport();
            setPhase('ended');
        }
    }, [callId, closeTransport]);

    const toggleMute = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()?.[0];
        if (!audioTrack) {
            return;
        }

        const nextEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextEnabled;
        setIsMuted(!nextEnabled);
    }, []);

    useEffect(() => {
        if (!canStart || !callId || !user?.id) {
            setCall(null);
            setPhase('idle');
            closeTransport();
            return;
        }

        let isMounted = true;
        const socket = getCallSocket({ userId: user.id, token });

        const handleCallUpdated = (payload: { call?: TripCall }) => {
            const nextCall = payload.call;
            if (!isMounted || !nextCall || nextCall.id !== callId) {
                return;
            }

            if (['ended', 'rejected', 'missed'].includes(nextCall.status)) {
                handleEndedCall();
                return;
            }

            setCall(nextCall);
            void applyCallSnapshot(nextCall);
        };

        const bootstrap = async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?callId=${callId}`);
                const nextCall = (res.data?.call ?? null) as TripCall | null;

                if (!isMounted) {
                    return;
                }

                if (!nextCall || ['ended', 'rejected', 'missed'].includes(nextCall.status)) {
                    handleEndedCall();
                    return;
                }

                setCall(nextCall);
                await applyCallSnapshot(nextCall);
            } catch (error) {
                console.error('[WebRTC] Failed to bootstrap call state', error);
                if (isMounted) {
                    setPhase('error');
                }
            }
        };

        socket.on('call:updated', handleCallUpdated);
        void bootstrap();

        return () => {
            isMounted = false;
            socket.off('call:updated', handleCallUpdated);
            closeTransport();
        };
    }, [applyCallSnapshot, callId, canStart, closeTransport, handleEndedCall, token, user?.id]);

    return {
        call,
        phase,
        localReady,
        remoteAudioReady,
        isMuted,
        toggleMute,
        endCall,
    };
};
