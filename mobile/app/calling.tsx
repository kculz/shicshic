import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Image, Platform, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat,
    withTiming, interpolate, withDelay
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

const PulseCircle = ({ delay = 0 }: { delay?: number }) => {
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

    return <Animated.View style={[styles.pulse, animatedStyle]} />;
};

export default function CallingScreen() {
    const { driverName, vehicleMake, vehiclePlate } = useLocalSearchParams<{
        driverName: string;
        vehicleMake: string;
        vehiclePlate: string;
    }>();
    const router = useRouter();

    const handleEndCall = () => {
        router.back();
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background Gradient / Blur simulation */}
            <View style={styles.bgOverlay} />

            <View style={styles.container}>
                {/* Driver Info */}
                <View style={styles.header}>
                    <Text style={styles.callingText}>Calling...</Text>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <Text style={styles.vehicleText}>{vehicleMake} · {vehiclePlate}</Text>
                </View>

                {/* Animated Avatar Section */}
                <View style={styles.avatarContainer}>
                    <PulseCircle />
                    <PulseCircle delay={800} />
                    <PulseCircle delay={1600} />
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                                {driverName?.split(' ').map(n => n[0]).join('') || 'DR'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
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
    bgOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: DARK,
        opacity: 0.9,
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
        paddingBottom: 60,
    },
    header: {
        alignItems: 'center',
    },
    callingText: {
        color: ORANGE,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    driverName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
    },
    vehicleText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
    },
    avatarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 300,
        width: 300,
    },
    pulse: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: ORANGE,
    },
    avatarWrapper: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#fff',
        padding: 4,
        elevation: 10,
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    avatarPlaceholder: {
        flex: 1,
        borderRadius: 72,
        backgroundColor: DARK,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    bottomActions: {
        width: '100%',
        alignItems: 'center',
        gap: 40,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
    },
    actionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    actionLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
    },
    endBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
});
