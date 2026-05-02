import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat,
    withTiming, withDelay
} from 'react-native-reanimated';
import apiClient from '../api/client';

const { width } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';

const PulseCircle = ({ delay = 0, color = ORANGE }: { delay?: number, color?: string }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withDelay(delay, withRepeat(withTiming(2.2, { duration: 2500 }), -1, false));
        opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2500 }), -1, false));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={[styles.pulse, { backgroundColor: color }, animatedStyle]} />;
};

export default function IncomingCallScreen() {
    const { callId, callerName, tripId } = useLocalSearchParams<{
        callId: string;
        callerName: string;
        tripId: string;
    }>();
    const router = useRouter();
    const [status, setStatus] = useState<'incoming' | 'accepted'>('incoming');
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (status === 'accepted') {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    // Poll for call status (in case caller hangs up)
    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?callId=${callId}`);
                if (!res.data.call || res.data.call.status === 'ended' || res.data.call.status === 'rejected') {
                    router.back();
                }
            } catch { /* ignore */ }
        }, 3000);
        return () => clearInterval(poll);
    }, [callId]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleAccept = async () => {
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'active' });
            setStatus('accepted');
        } catch {
            router.back();
        }
    };

    const handleDecline = async () => {
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'rejected' });
        } finally {
            router.back();
        }
    };

    const handleEndCall = async () => {
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'ended' });
        } finally {
            router.back();
        }
    };

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.bgOverlay} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.callingText}>
                        {status === 'incoming' ? 'Incoming In-App Call' : 'In-Call'}
                    </Text>
                    <Text style={styles.callerName}>{callerName || 'Passenger'}</Text>
                    {status === 'accepted' && (
                        <Text style={styles.timer}>{formatTime(timer)}</Text>
                    )}
                </View>

                <View style={styles.avatarContainer}>
                    {status === 'incoming' ? (
                        <>
                            <PulseCircle color={ORANGE} />
                            <PulseCircle delay={800} color={ORANGE} />
                        </>
                    ) : (
                        <>
                            <PulseCircle color={GREEN} />
                            <PulseCircle delay={800} color={GREEN} />
                        </>
                    )}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                                {callerName?.split(' ').map(n => n[0]).join('') || 'P'}
                            </Text>
                        </View>
                    </View>
                </View>

                {status === 'incoming' ? (
                    <View style={styles.incomingActions}>
                        <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={handleDecline}>
                            <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                            <Text style={styles.actionLabel}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept}>
                            <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                            <Text style={styles.actionLabel}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.bottomActions}>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.smallActionBtn}>
                                <MaterialCommunityIcons name="microphone-off" size={24} color="#fff" />
                                <Text style={styles.smallActionLabel}>Mute</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.smallActionBtn}>
                                <MaterialCommunityIcons name="volume-high" size={24} color="#fff" />
                                <Text style={styles.smallActionLabel}>Speaker</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.actionBtn, styles.declineBtn, { width: 72, height: 72 }]} onPress={handleEndCall}>
                            <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: DARK },
    bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, opacity: 0.9 },
    container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 80, paddingBottom: 60 },
    header: { alignItems: 'center' },
    callingText: { color: ORANGE, fontSize: 14, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 },
    callerName: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
    timer: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '600' },
    avatarContainer: { justifyContent: 'center', alignItems: 'center', height: 260, width: 260 },
    pulse: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
    avatarWrapper: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#fff', padding: 4, elevation: 10, shadowColor: ORANGE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },
    avatarPlaceholder: { flex: 1, borderRadius: 72, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
    incomingActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 40 },
    bottomActions: { width: '100%', alignItems: 'center', gap: 40 },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 60, width: '100%' },
    actionBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', gap: 4 },
    declineBtn: { backgroundColor: '#EF4444' },
    acceptBtn: { backgroundColor: GREEN },
    actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 5 },
    smallActionBtn: { alignItems: 'center', gap: 8 },
    smallActionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
});
