import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';
import apiClient from '../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

interface Bid {
    id: string;
    driverName: string;
    driverPhone: string;
    driverRating: number;
    vehicleMake: string;
    vehiclePlate: string;
    offeredFare: number;
    currency: string;
    estimatedArrivalMins: number;
    status: string;
    receivedAt: number; // For local 12s timer
}

const Stars = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <MaterialCommunityIcons key={i} name={i < full ? 'star' : 'star-outline'} size={12} color={i < full ? '#F59E0B' : '#DDD'} />
            ))}
            <Text style={{ fontSize: 11, color: GRAY, marginLeft: 2 }}>{rating}</Text>
        </View>
    );
};

export default function BiddingScreen() {
    const { tripId, passengerFare, destName } = useLocalSearchParams<{ tripId: string; passengerFare: string; destName: string }>();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const router = useRouter();

    const loadBids = useCallback(async () => {
        try {
            const res = await apiClient.get(`/trips/${tripId}/bids`);
            const newBids = (res.data.bids ?? []).map((b: any) => ({
                ...b,
                receivedAt: b.receivedAt || Date.now()
            }));

            setBids(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const added = newBids.filter((nb: Bid) => !existingIds.has(nb.id));
                return [...prev, ...added];
            });
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        loadBids();
        const poll = setInterval(loadBids, 3000);

        // Timer to expire bids after 12s
        const cleaner = setInterval(() => {
            const now = Date.now();
            setBids(prev => prev.filter(b => (now - b.receivedAt) < 12000));
        }, 1000);

        return () => {
            clearInterval(poll);
            clearInterval(cleaner);
        };
    }, [loadBids]);

    const handleAccept = async (bid: Bid) => {
        setAcceptingId(bid.id);
        try {
            await apiClient.post(`/trips/${tripId}/bids/${bid.id}/accept`);
            router.replace({
                pathname: '/chat' as any,
                params: {
                    tripId,
                    driverName: bid.driverName,
                    driverPhone: bid.driverPhone,
                    vehicleMake: bid.vehicleMake,
                    vehiclePlate: bid.vehiclePlate,
                    fare: String(bid.offeredFare),
                    destName,
                },
            });
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Could not accept driver');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleReject = async (bidId: string) => {
        await apiClient.post(`/trips/${tripId}/bids/${bidId}/reject`);
        setBids(prev => prev.filter(b => b.id !== bidId));
    };

    const renderBid = ({ item, index }: { item: Bid, index: number }) => (
        <Animated.View
            entering={FadeInUp.delay(index * 100)}
            exiting={FadeOutDown}
            layout={Layout.springify()}
            style={styles.card}
        >
            {/* Avatar + name */}
            <View style={styles.cardTop}>
                <View style={styles.avatar}>
                    <MaterialCommunityIcons
                        name={item.vehicleMake.toLowerCase().includes('honda') ? 'car-back' : 'car-hatchback'}
                        size={24}
                        color={ORANGE}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{item.driverName}</Text>
                    <Stars rating={item.driverRating} />
                    <Text style={styles.vehicle}>{item.vehicleMake} · {item.vehiclePlate}</Text>
                </View>
                <View style={styles.fareCol}>
                    <Text style={styles.driverFare}>${item.offeredFare}</Text>
                    <Text style={styles.fareLabel}>offer</Text>
                </View>
            </View>

            {/* ETA */}
            <View style={styles.etaRow}>
                <MaterialCommunityIcons name="clock-fast" size={14} color={ORANGE} />
                <Text style={styles.etaText}>{item.estimatedArrivalMins} min away</Text>
                {Number(item.offeredFare) <= Number(passengerFare) && (
                    <View style={styles.matchBadge}>
                        <Text style={styles.matchBadgeText}>✓ Matches your offer</Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
                    <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.acceptBtn, acceptingId === item.id && { backgroundColor: '#FFB885' }]}
                    onPress={() => handleAccept(item)}
                    disabled={acceptingId !== null}
                    activeOpacity={0.85}
                >
                    {acceptingId === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <MaterialCommunityIcons name="check" size={18} color="#fff" />
                            <Text style={styles.acceptText}>Accept</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={DARK} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Nearby Drivers</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>→ {destName} · Your offer: ${passengerFare}</Text>
                </View>
                <TouchableOpacity onPress={loadBids}>
                    <MaterialCommunityIcons name="refresh" size={22} color={ORANGE} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={ORANGE} />
                    <Text style={styles.loadingText}>Finding drivers near you...</Text>
                </View>
            ) : bids.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="car-search" size={60} color="#DDD" />
                    <Text style={styles.emptyTitle}>No drivers yet</Text>
                    <Text style={styles.emptyText}>Waiting for nearby drivers to respond...</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={loadBids}>
                        <Text style={styles.refreshBtnText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={bids}
                    keyExtractor={b => b.id}
                    renderItem={renderBid}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.listHeader}>{bids.length} driver{bids.length > 1 ? 's' : ''} responded</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F7F7F9' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: DARK },
    headerSub: { fontSize: 12, color: GRAY, marginTop: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32 },
    loadingText: { fontSize: 14, color: GRAY, textAlign: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#BBB' },
    emptyText: { fontSize: 13, color: '#CCC', textAlign: 'center' },
    refreshBtn: { marginTop: 8, backgroundColor: ORANGE_LIGHT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    refreshBtnText: { color: ORANGE, fontWeight: '700' },
    list: { padding: 16, gap: 12 },
    listHeader: { fontSize: 13, color: GRAY, fontWeight: '600', marginBottom: 4 },
    card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: ORANGE_LIGHT, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: ORANGE },
    avatarText: { fontSize: 16, fontWeight: '800', color: ORANGE },
    driverName: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
    vehicle: { fontSize: 11, color: GRAY, marginTop: 2 },
    fareCol: { alignItems: 'flex-end' },
    driverFare: { fontSize: 22, fontWeight: '800', color: DARK },
    fareLabel: { fontSize: 11, color: GRAY },
    etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    etaText: { fontSize: 12, color: GRAY, fontWeight: '600' },
    matchBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 4 },
    matchBadgeText: { fontSize: 11, fontWeight: '600', color: '#22C55E' },
    actions: { flexDirection: 'row', gap: 10 },
    rejectBtn: { flex: 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
    rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
    acceptBtn: { flex: 0.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: ORANGE, shadowColor: ORANGE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
    acceptText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
