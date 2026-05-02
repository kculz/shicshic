import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Image, Platform, Dimensions, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat,
    withTiming, interpolate, withDelay
} from 'react-native-reanimated';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

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

export default function CallingScreen() {
    const { user } = useAuthStore();
    const { tripId, receiverId, driverName, vehicleMake, vehiclePlate } = useLocalSearchParams<{
        tripId: string;
        receiverId: string;
        driverName: string;
        vehicleMake: string;
        vehiclePlate: string;
    }>();
    const router = useRouter();
    const [callId, setCallId] = useState<string | null>(null);
    const [status, setStatus] = useState<'dialing' | 'active'>('dialing');
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        const startCall = async () => {
            try {
                const res = await apiClient.post('/trips/calls', {
                    tripId,
                    callerId: user?.id,
                    receiverId
                });
                setCallId(res.data.call.id);
            } catch (e) {
                Alert.alert('Error', 'Could not initiate call');
                router.back();
            }
        };
        startCall();
    }, []);

    useEffect(() => {
        if (!callId) return;
        const poll = setInterval(async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?userId=${user?.id}`);
                const call = res.data.call;
                if (!call || call.id !== callId || call.status === 'ended' || call.status === 'rejected') {
                    router.back();
                } else if (call.status === 'active' && status === 'dialing') {
                    setStatus('active');
                }
            } catch { /* ignore */ }
        }, 3000);
        return () => clearInterval(poll);
    }, [callId, status]);

    useEffect(() => {
        let interval: any;
        if (status === 'active') {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleEndCall = async () => {
        if (callId) {
            try {
                await apiClient.patch(`/trips/calls/${callId}`, { status: 'ended' });
            } catch { /* ignore */ }
        }
        router.back();
    };

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.bgOverlay} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.callingText, status === 'active' && { color: GREEN }]}>
                        {status === 'dialing' ? 'Calling...' : 'In-Call'}
                    </Text>
                    <Text style={styles.driverName}>{driverName}</Text>
                    {status === 'active' ? (
                        <Text style={styles.timer}>{formatTime(timer)}</Text>
                    ) : (
                        <Text style={styles.vehicleText}>{vehicleMake} · {vehiclePlate}</Text>
                    )}
                </View>

                <View style={styles.avatarContainer}>
                    <PulseCircle color={status === 'active' ? GREEN : ORANGE} />
                    <PulseCircle delay={800} color={status === 'active' ? GREEN : ORANGE} />
                    <PulseCircle delay={1600} color={status === 'active' ? GREEN : ORANGE} />
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                                {driverName?.split(' ').map(n => n[0]).join('') || 'DR'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomActions}>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn}>
                            <MaterialCommunityIcons name="microphone-off" size={28} color="#fff" />
                            <Text style={styles.actionLabel}>Mute</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn}>
                            <MaterialCommunityIcons name="volume-high" size={28} color="#fff" />
                            <Text style={styles.actionLabel}>Speaker</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn}>
                            <MaterialCommunityIcons name="dialpad" size={28} color="#fff" />
                            <Text style={styles.actionLabel}>Keypad</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.endBtn} onPress={handleEndCall} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: DARK },
    bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, opacity: 0.9 },
    container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 60 },
    header: { alignItems: 'center' },
    callingText: { color: ORANGE, fontSize: 16, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 },
    driverName: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
    vehicleText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
    timer: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '600' },
    avatarContainer: { justifyContent: 'center', alignItems: 'center', height: 300, width: 300 },
    pulse: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
    avatarWrapper: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#fff', padding: 4, elevation: 10, shadowColor: ORANGE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },
    avatarPlaceholder: { flex: 1, borderRadius: 72, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
    bottomActions: { width: '100%', alignItems: 'center', gap: 40 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', width: '80%' },
    actionBtn: { alignItems: 'center', gap: 8 },
    actionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
    endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
});
