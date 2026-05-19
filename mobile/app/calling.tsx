import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Alert, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '../api/client';
import LeafletMap from '../components/LeafletMap';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { useTripDemo } from '../hooks/useTripDemo';
import { useWebRTCCall } from '../hooks/useWebRTCCall';
import type { TripCall, TripCallParticipant } from '../types/call';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';
const RED = '#EF4444';

export default function CallingScreen() {
    const { user } = useAuthStore();
    const { currentTrip, fetchTripSession } = useTripStore();
    const {
        tripId,
        receiverId,
        contactName,
        callId: initialCallId,
    } = useLocalSearchParams<{
        tripId: string;
        receiverId?: string;
        contactName?: string;
        callId?: string;
    }>();
    const router = useRouter();
    const trip = currentTrip?.id === tripId ? currentTrip : null;
    const demo = useTripDemo(trip);

    const [callId, setCallId] = useState<string | null>(initialCallId || null);
    const [participant, setParticipant] = useState<TripCallParticipant | null>(
        initialCallId ? null : receiverId ? 'caller' : null
    );
    const [resolvedContactName, setResolvedContactName] = useState(contactName || '');
    const [timer, setTimer] = useState(0);
    const [bootstrapping, setBootstrapping] = useState(Boolean(initialCallId));

    useEffect(() => {
        if (!tripId) return;
        void fetchTripSession(tripId);
    }, [fetchTripSession, tripId]);

    useEffect(() => {
        if (!tripId || !user?.id || !receiverId || initialCallId) return;

        let isMounted = true;

        const startCall = async () => {
            try {
                const receiverName = contactName
                    || (user.role === 'passenger' ? trip?.driverName : trip?.passengerName)
                    || 'Ride contact';
                const callerName = user.fullName || (user.role === 'driver' ? 'Driver' : 'Passenger');

                const res = await apiClient.post('/trips/calls', {
                    tripId,
                    callerId: user.id,
                    receiverId,
                    callerName,
                    receiverName,
                });

                if (!isMounted) {
                    return;
                }

                setCallId(res.data.call.id);
                setParticipant('caller');
                setResolvedContactName(receiverName);
            } catch (error) {
                console.error('[Calling] Failed to start call', error);
                Alert.alert('Call unavailable', 'We could not start the voice call right now.');
                router.back();
            }
        };

        void startCall();

        return () => {
            isMounted = false;
        };
    }, [contactName, initialCallId, receiverId, router, trip?.driverName, trip?.passengerName, tripId, user?.fullName, user?.id, user?.role]);

    useEffect(() => {
        if (!initialCallId || !user?.id) {
            setBootstrapping(false);
            return;
        }

        let isMounted = true;

        const loadExistingCall = async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?callId=${initialCallId}`);
                const call = (res.data?.call ?? null) as TripCall | null;

                if (!isMounted) {
                    return;
                }

                if (!call) {
                    router.back();
                    return;
                }

                setCallId(call.id);
                setParticipant(call.callerId === user.id ? 'caller' : 'receiver');
                setResolvedContactName(
                    call.callerId === user.id
                        ? call.receiverName || contactName || 'Ride contact'
                        : call.callerName || contactName || 'Ride contact'
                );
            } catch (error) {
                console.error('[Calling] Failed to load active call', error);
                router.back();
            } finally {
                if (isMounted) {
                    setBootstrapping(false);
                }
            }
        };

        void loadExistingCall();

        return () => {
            isMounted = false;
        };
    }, [contactName, initialCallId, router, user?.id]);

    const {
        call,
        phase,
        localReady,
        remoteAudioReady,
        isMuted,
        toggleMute,
        endCall,
    } = useWebRTCCall({
        callId,
        participant,
        enabled: Boolean(callId && participant),
        onEnded: () => {
            router.back();
        },
    });

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (phase === 'active') {
            interval = setInterval(() => setTimer((value) => value + 1), 1000);
        } else {
            setTimer(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [phase]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const phaseTitle = useMemo(() => {
        switch (phase) {
            case 'preparing':
                return 'Preparing microphone';
            case 'dialing':
                return 'Calling now';
            case 'connecting':
                return 'Joining audio';
            case 'active':
                return 'Voice call live';
            case 'error':
                return 'Connection needs another try';
            default:
                return 'Starting call';
        }
    }, [phase]);

    const phaseDetail = useMemo(() => {
        if (phase === 'active') {
            return `${formatTime(timer)} on call`;
        }

        if (phase === 'error') {
            return 'The live ride map is still visible while the audio reconnects.';
        }

        if (!localReady) {
            return 'Requesting microphone access and preparing your device.';
        }

        if (!remoteAudioReady) {
            return 'We are exchanging secure WebRTC audio details with the other rider.';
        }

        return demo?.phaseTitle || 'Syncing ride and call details';
    }, [demo?.phaseTitle, localReady, phase, remoteAudioReady, timer]);

    const activeContactName = resolvedContactName
        || (participant === 'caller' ? call?.receiverName : call?.callerName)
        || (user?.role === 'passenger' ? trip?.driverName : trip?.passengerName)
        || 'Ride contact';

    const handleLeaveCall = async () => {
        await endCall();
        router.back();
    };

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.mapWrap}>
                {trip ? (
                    <LeafletMap
                        userLat={null}
                        userLon={null}
                        pickupLat={trip.pickupLat}
                        pickupLon={trip.pickupLon}
                        destLat={trip.destLat}
                        destLon={trip.destLon}
                        driverLat={demo?.driverLat ?? null}
                        driverLon={demo?.driverLon ?? null}
                    />
                ) : (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator color="#fff" />
                    </View>
                )}

                <View style={styles.mapOverlayTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleLeaveCall}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.timerPill}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" />
                        <Text style={styles.timerPillText}>{demo?.countdownLabel || 'Syncing trip'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.sheet}>
                <Text style={[styles.callingText, phase === 'active' && styles.callingTextActive, phase === 'error' && styles.callingTextError]}>
                    {phaseTitle}
                </Text>
                <Text style={styles.driverName}>{activeContactName}</Text>
                <Text style={styles.metaText}>{phaseDetail}</Text>

                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Pickup</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>{trip?.pickupLocation || 'Loading pickup'}</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Destination</Text>
                        <Text style={styles.infoValue} numberOfLines={2}>{trip?.destinationLocation || 'Loading destination'}</Text>
                    </View>
                </View>

                <View style={styles.highlightCard}>
                    <MaterialCommunityIcons name="car-connected" size={22} color={ORANGE} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.highlightTitle}>{demo?.phaseTitle || 'Live ride map'}</Text>
                        <Text style={styles.highlightText}>{demo?.phaseDetail || 'The car animation and countdown stay visible while the call is live.'}</Text>
                    </View>
                </View>

                <View style={styles.statusGrid}>
                    <TouchableOpacity style={styles.smallActionBtn} onPress={toggleMute} activeOpacity={0.85}>
                        <MaterialCommunityIcons name={isMuted ? 'microphone-off' : 'microphone'} size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>{isMuted ? 'Muted' : 'Mic on'}</Text>
                    </TouchableOpacity>

                    <View style={styles.smallActionBtn}>
                        <MaterialCommunityIcons name={localReady ? 'access-point' : 'timer-sand'} size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>{localReady ? 'Local ready' : 'Preparing'}</Text>
                    </View>

                    <View style={styles.smallActionBtn}>
                        <MaterialCommunityIcons name={remoteAudioReady ? 'phone-in-talk' : 'radio-tower'} size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>{remoteAudioReady ? 'Audio ready' : 'Connecting'}</Text>
                    </View>
                </View>

                {bootstrapping ? (
                    <View style={styles.bootstrapRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.bootstrapText}>Loading the active call...</Text>
                    </View>
                ) : null}

                <TouchableOpacity style={styles.endBtn} onPress={handleLeaveCall} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="phone-hangup" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: DARK },
    mapWrap: { flex: 1.05, backgroundColor: '#111827' },
    mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
    mapOverlayTop: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 30, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(26,26,46,0.72)', justifyContent: 'center', alignItems: 'center' },
    timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(26,26,46,0.82)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
    timerPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    sheet: { flex: 0.95, backgroundColor: DARK, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -16, paddingHorizontal: 20, paddingTop: 22, paddingBottom: Platform.OS === 'ios' ? 34 : 22 },
    callingText: { color: ORANGE, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
    callingTextActive: { color: GREEN },
    callingTextError: { color: '#F59E0B' },
    driverName: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
    metaText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 6 },
    infoRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    infoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14 },
    infoLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 8 },
    highlightCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 18 },
    highlightTitle: { color: DARK, fontSize: 15, fontWeight: '800' },
    highlightText: { color: '#5C6476', fontSize: 12, lineHeight: 18, marginTop: 3 },
    statusGrid: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 26 },
    smallActionBtn: { alignItems: 'center', gap: 8, minWidth: 90 },
    smallActionLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600' },
    bootstrapRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 },
    bootstrapText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '600' },
    endBtn: { alignSelf: 'center', marginTop: 28, width: 78, height: 78, borderRadius: 39, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', shadowColor: RED, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
});
