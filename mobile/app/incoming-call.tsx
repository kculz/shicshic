import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat,
    withTiming, withDelay
} from 'react-native-reanimated';
import apiClient from '../api/client';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GREEN = '#22C55E';

const PulseCircle = ({ delay = 0, color = ORANGE }: { delay?: number; color?: string }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withDelay(delay, withRepeat(withTiming(2.2, { duration: 2500 }), -1, false));
        opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2500 }), -1, false));
    }, [delay, opacity, scale]);

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
    const [accepting, setAccepting] = React.useState(false);

    useEffect(() => {
        if (!callId) return;

        const poll = setInterval(async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?callId=${callId}`);
                if (!res.data.call || res.data.call.status === 'ended' || res.data.call.status === 'rejected') {
                    router.back();
                }
            } catch (error) {
                console.error('[IncomingCall] Failed to poll call', error);
            }
        }, 2000);

        return () => clearInterval(poll);
    }, [callId, router]);

    const handleAccept = async () => {
        if (!callId) return;

        setAccepting(true);
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'active' });
            router.replace({
                pathname: '/calling',
                params: {
                    callId,
                    tripId,
                    contactName: callerName,
                },
            });
        } catch (error) {
            console.error('[IncomingCall] Failed to accept call', error);
            router.back();
        } finally {
            setAccepting(false);
        }
    };

    const handleDecline = async () => {
        try {
            await apiClient.patch(`/trips/calls/${callId}`, { status: 'rejected' });
        } catch (error) {
            console.error('[IncomingCall] Failed to decline call', error);
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
                    <Text style={styles.callingText}>Incoming In-App Call</Text>
                    <Text style={styles.callerName}>{callerName || 'Ride contact'}</Text>
                    <Text style={styles.helperText}>Accept to open the live trip map and continue the conversation.</Text>
                </View>

                <View style={styles.avatarContainer}>
                    <PulseCircle color={ORANGE} />
                    <PulseCircle delay={800} color={ORANGE} />
                    <PulseCircle delay={1600} color={GREEN} />
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                                {callerName?.split(' ').map((name) => name[0]).join('').slice(0, 2) || 'RC'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.incomingActions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={handleDecline}>
                        <MaterialCommunityIcons name="phone-hangup" size={30} color="#fff" />
                        <Text style={styles.actionLabel}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept} disabled={accepting}>
                        {accepting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="phone" size={30} color="#fff" />
                                <Text style={styles.actionLabel}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: DARK },
    bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: DARK, opacity: 0.92 },
    container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 88, paddingBottom: 60 },
    header: { alignItems: 'center', paddingHorizontal: 28 },
    callingText: { color: ORANGE, fontSize: 14, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 2 },
    callerName: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    helperText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
    avatarContainer: { justifyContent: 'center', alignItems: 'center', height: 280, width: 280 },
    pulse: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
    avatarWrapper: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', padding: 4, shadowColor: ORANGE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 10 },
    avatarPlaceholder: { flex: 1, borderRadius: 76, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
    incomingActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 40, gap: 28 },
    actionBtn: { flex: 1, height: 84, borderRadius: 28, justifyContent: 'center', alignItems: 'center', gap: 6 },
    declineBtn: { backgroundColor: '#EF4444' },
    acceptBtn: { backgroundColor: GREEN },
    actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 5 },
});
