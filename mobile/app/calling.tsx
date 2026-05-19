import React, { useEffect, useState } from 'react';
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

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';

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
    const [status, setStatus] = useState<'dialing' | 'active'>('dialing');
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        if (!tripId) return;
        void fetchTripSession(tripId);
    }, [fetchTripSession, tripId]);

    useEffect(() => {
        if (!tripId || !user?.id || !receiverId || initialCallId) return;

        const startCall = async () => {
            try {
                const res = await apiClient.post('/trips/calls', {
                    tripId,
                    callerId: user.id,
                    receiverId,
                });
                setCallId(res.data.call.id);
            } catch (error) {
                console.error('[Calling] Failed to start call', error);
                Alert.alert('Error', 'Could not initiate call');
                router.back();
            }
        };

        void startCall();
    }, [initialCallId, receiverId, router, tripId, user?.id]);

    useEffect(() => {
        if (!callId) return;

        const poll = setInterval(async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?callId=${callId}`);
                const call = res.data.call;

                if (!call || call.status === 'ended' || call.status === 'rejected') {
                    router.back();
                    return;
                }

                if (call.status === 'active') {
                    setStatus('active');
                } else {
                    setStatus('dialing');
                }
            } catch (error) {
                console.error('[Calling] Failed to poll call', error);
            }
        }, 2000);

        return () => clearInterval(poll);
    }, [callId, router]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (status === 'active') {
            interval = setInterval(() => setTimer((value) => value + 1), 1000);
        } else {
            setTimer(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleEndCall = async () => {
        if (callId) {
            try {
                await apiClient.patch(`/trips/calls/${callId}`, { status: 'ended' });
            } catch (error) {
                console.error('[Calling] Failed to end call', error);
            }
        }

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
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.timerPill}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" />
                        <Text style={styles.timerPillText}>{demo?.countdownLabel || 'Syncing trip'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.sheet}>
                <Text style={[styles.callingText, status === 'active' && styles.callingTextActive]}>
                    {status === 'dialing' ? 'Calling now' : 'In-App Call Live'}
                </Text>
                <Text style={styles.driverName}>{contactName || (user?.role === 'passenger' ? trip?.driverName : trip?.passengerName) || 'Ride contact'}</Text>
                <Text style={styles.metaText}>
                    {status === 'active'
                        ? `${formatTime(timer)} on call`
                        : demo?.phaseTitle || 'Connecting call and ride details'}
                </Text>

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
                        <Text style={styles.highlightText}>{demo?.phaseDetail || 'The car will animate on the map as the ride progresses.'}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.smallActionBtn}>
                        <MaterialCommunityIcons name="microphone-off" size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>Mute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.smallActionBtn}>
                        <MaterialCommunityIcons name="volume-high" size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>Speaker</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={() => router.replace({ pathname: '/chat', params: { tripId } })}
                    >
                        <MaterialCommunityIcons name="message-text-outline" size={24} color="#fff" />
                        <Text style={styles.smallActionLabel}>Chat</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.endBtn} onPress={handleEndCall} activeOpacity={0.85}>
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
    driverName: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
    metaText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 6 },
    infoRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    infoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14 },
    infoLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 8 },
    highlightCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 18 },
    highlightTitle: { color: DARK, fontSize: 15, fontWeight: '800' },
    highlightText: { color: '#5C6476', fontSize: 12, lineHeight: 18, marginTop: 3 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 26 },
    smallActionBtn: { alignItems: 'center', gap: 8 },
    smallActionLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600' },
    endBtn: { alignSelf: 'center', marginTop: 28, width: 78, height: 78, borderRadius: 39, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
});
