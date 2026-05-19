import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, StatusBar, Linking, Alert,
    Modal, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '../api/client';
import LeafletMap from '../components/LeafletMap';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { useTripDemo } from '../hooks/useTripDemo';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const BG = '#F7F7F9';

interface Message {
    id: string;
    senderId: string;
    senderRole: 'passenger' | 'driver';
    senderName: string;
    message: string;
    createdAt: string;
}

export default function ChatScreen() {
    const { user } = useAuthStore();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const { currentTrip, fetchTripSession, sessionLoading } = useTripStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const listRef = useRef<FlatList>(null);
    const lastIncomingCallIdRef = useRef<string | null>(null);
    const router = useRouter();

    const trip = currentTrip?.id === tripId ? currentTrip : null;
    const demo = useTripDemo(trip);
    const counterpartName = user?.role === 'passenger' ? trip?.driverName || 'Driver' : trip?.passengerName || 'Passenger';
    const counterpartPhone = user?.role === 'passenger' ? trip?.driverPhone || '' : trip?.passengerPhone || '';
    const receiverId = user?.role === 'passenger' ? trip?.driverId || '' : trip?.passengerId || '';
    const countdownLabel = demo?.stage === 'to_destination'
        ? 'to arrive'
        : demo?.stage === 'to_pickup'
            ? 'to pickup'
            : 'status';

    const loadMessages = useCallback(async () => {
        if (!tripId) return;

        try {
            const res = await apiClient.get(`/trips/${tripId}/messages`);
            setMessages(res.data.messages ?? []);
        } catch (error) {
            console.error('[Chat] Failed to load messages', error);
        }
    }, [tripId]);

    useEffect(() => {
        if (!tripId) return;
        void fetchTripSession(tripId);
    }, [fetchTripSession, tripId]);

    useEffect(() => {
        if (!tripId || !user?.id) return;

        void loadMessages();
        const messageInterval = setInterval(() => {
            void loadMessages();
        }, 3000);

        const tripInterval = setInterval(() => {
            void fetchTripSession(tripId);
        }, 4000);

        const callInterval = setInterval(async () => {
            try {
                const res = await apiClient.get(`/trips/calls/active?userId=${user.id}`);
                const call = res.data.call;

                if (!call || call.receiverId !== user.id || call.status !== 'dialing') {
                    if (!call || call.status !== 'dialing') {
                        lastIncomingCallIdRef.current = null;
                    }
                    return;
                }

                if (lastIncomingCallIdRef.current === call.id) {
                    return;
                }

                lastIncomingCallIdRef.current = call.id;
                router.push({
                    pathname: '/incoming-call' as const,
                    params: {
                        callId: call.id,
                        callerName: counterpartName,
                        tripId: call.tripId,
                    },
                });
            } catch (error) {
                console.error('[Chat] Failed to poll active calls', error);
            }
        }, 2500);

        return () => {
            clearInterval(messageInterval);
            clearInterval(tripInterval);
            clearInterval(callInterval);
        };
    }, [counterpartName, fetchTripSession, loadMessages, router, tripId, user?.id]);

    useEffect(() => {
        if (messages.length) {
            const timer = setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 120);

            return () => clearTimeout(timer);
        }
    }, [messages.length]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || !tripId || !user?.id) return;

        setText('');
        setSending(true);
        try {
            await apiClient.post(`/trips/${tripId}/messages`, {
                senderId: user.id,
                senderRole: user.role,
                senderName: user.fullName || (user.role === 'driver' ? 'Driver' : 'Passenger'),
                message: trimmed,
            });
            await loadMessages();
        } catch (error) {
            console.error('[Chat] Failed to send message', error);
            Alert.alert('Error', 'Could not send message');
        } finally {
            setSending(false);
        }
    };

    const handleCarrierCall = () => {
        setShowCallMenu(false);
        if (!counterpartPhone) {
            Alert.alert('Phone unavailable', 'The other user does not have a phone number ready yet.');
            return;
        }

        Linking.openURL(`tel:${counterpartPhone}`).catch(() =>
            Alert.alert('Cannot call', 'Unable to open the phone dialer')
        );
    };

    const handleInAppCall = () => {
        setShowCallMenu(false);
        if (!tripId || !receiverId) {
            Alert.alert('Please wait', 'The ride connection is still loading.');
            return;
        }

        router.push({
            pathname: '/calling' as const,
            params: {
                tripId,
                receiverId,
                contactName: counterpartName,
            },
        });
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === user?.id;
        return (
            <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                {!isMe ? (
                    <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarText}>{item.senderName.split(' ').map((name) => name[0]).join('').slice(0, 2)}</Text>
                    </View>
                ) : null}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.message}</Text>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={DARK} />
                </TouchableOpacity>

                <View style={styles.driverInfo}>
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>
                            {counterpartName.split(' ').map((name) => name[0]).join('').slice(0, 2)}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.driverName}>{counterpartName}</Text>
                        <Text style={styles.vehicleText} numberOfLines={1}>
                            {user?.role === 'passenger'
                                ? `${trip?.vehicleColor || ''} ${trip?.vehicleMake || ''} ${trip?.vehicleModel || ''} ${trip?.vehiclePlate || ''}`.trim() || 'Accepted ride'
                                : `Pickup: ${trip?.pickupLocation || 'Loading pickup point'}`}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.sosBtn}
                    onPress={() => router.push({ pathname: '/report-incident', params: { tripId } })}
                >
                    <MaterialCommunityIcons name="alert-octagon" size={18} color="#fff" />
                    <Text style={styles.sosText}>SOS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.callBtn} onPress={() => setShowCallMenu(true)}>
                    <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.tripCard}>
                <View style={styles.tripCardTop}>
                    <View>
                        <Text style={styles.tripEyebrow}>Live trip</Text>
                        <Text style={styles.tripTitle}>{demo?.phaseTitle || 'Connecting your ride'}</Text>
                        <Text style={styles.tripSubtitle}>{demo?.phaseDetail || 'Loading the accepted ride details...'}</Text>
                    </View>
                    <View style={styles.tripCountdown}>
                        <Text style={styles.tripCountdownValue}>{demo?.minutesLeft ?? '--'} min</Text>
                        <Text style={styles.tripCountdownLabel}>{countdownLabel}</Text>
                    </View>
                </View>

                <View style={styles.tripMap}>
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
                            <ActivityIndicator color={ORANGE} />
                        </View>
                    )}
                </View>

                <View style={styles.tripMetaRow}>
                    <View style={styles.tripMetaChip}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={ORANGE} />
                        <Text style={styles.tripMetaText} numberOfLines={1}>{trip?.pickupLocation || 'Pickup loading'}</Text>
                    </View>
                    <View style={styles.tripMetaChip}>
                        <MaterialCommunityIcons name="flag-checkered" size={14} color={ORANGE} />
                        <Text style={styles.tripMetaText} numberOfLines={1}>{trip?.destinationLocation || 'Destination loading'}</Text>
                    </View>
                </View>

                <View style={styles.tripBottomRow}>
                    <View style={styles.rideBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.rideBadgeText}>{demo?.countdownLabel || 'Syncing trip'}</Text>
                    </View>
                    <Text style={styles.fareText}>{trip?.fare ? `$${trip.fare.toFixed(2)}` : ''}</Text>
                </View>
            </View>

            {!trip && sessionLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={ORANGE} />
                    <Text style={styles.loadingText}>Loading your accepted ride...</Text>
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(message) => message.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <MaterialCommunityIcons name="chat-outline" size={36} color="#DDD" />
                            <Text style={styles.emptyChatText}>Messaging is ready. Say hello and coordinate the pickup.</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder={user?.role === 'driver' ? 'Message your passenger...' : 'Message your driver...'}
                    placeholderTextColor={GRAY}
                    multiline
                    maxLength={300}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || sending}
                    activeOpacity={0.85}
                >
                    {sending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <MaterialCommunityIcons name="send" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <Modal
                visible={showCallMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCallMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowCallMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuTitle}>Call {counterpartName}</Text>
                                <Text style={styles.menuSubTitle}>Choose how you want to connect.</Text>

                                <TouchableOpacity style={styles.menuBtn} onPress={handleCarrierCall}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#F0F9FF' }]}>
                                        <MaterialCommunityIcons name="cellphone" size={24} color="#0EA5E9" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuBtnText}>Carrier Call</Text>
                                        <Text style={styles.menuBtnSub}>Use the phone network for a regular call</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={GRAY} />
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.menuBtn, { borderBottomWidth: 0 }]} onPress={handleInAppCall}>
                                    <View style={[styles.menuIcon, { backgroundColor: ORANGE_LIGHT }]}>
                                        <MaterialCommunityIcons name="phone-outline" size={24} color={ORANGE} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuBtnText}>In-App Call</Text>
                                        <Text style={styles.menuBtnSub}>Stay in the trip view with the live map and timer</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={GRAY} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCallMenu(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    driverInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: ORANGE_LIGHT, borderWidth: 2, borderColor: ORANGE, justifyContent: 'center', alignItems: 'center' },
    avatarSmallText: { fontSize: 13, fontWeight: '800', color: ORANGE },
    driverName: { fontSize: 15, fontWeight: '700', color: DARK },
    vehicleText: { fontSize: 11, color: GRAY },
    sosBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    sosText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },

    tripCard: { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 24, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 4 },
    tripCardTop: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 12 },
    tripEyebrow: { fontSize: 11, fontWeight: '800', color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.6 },
    tripTitle: { marginTop: 4, fontSize: 18, fontWeight: '800', color: DARK },
    tripSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 18, color: GRAY, maxWidth: 220 },
    tripCountdown: { backgroundColor: ORANGE_LIGHT, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', minWidth: 84 },
    tripCountdownValue: { fontSize: 20, fontWeight: '900', color: ORANGE },
    tripCountdownLabel: { fontSize: 11, fontWeight: '700', color: '#A65100' },
    tripMap: { height: 220, overflow: 'hidden', borderRadius: 18, backgroundColor: '#F0F0F0' },
    mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tripMetaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    tripMetaChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F7F7F9', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
    tripMetaText: { flex: 1, fontSize: 11, color: DARK, fontWeight: '600' },
    tripBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    rideBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
    rideBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
    fareText: { fontSize: 16, fontWeight: '900', color: DARK },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 30 },
    loadingText: { fontSize: 14, color: GRAY, textAlign: 'center' },
    messageList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
    msgRowRight: { justifyContent: 'flex-end' },
    msgRowLeft: { justifyContent: 'flex-start' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    msgAvatarText: { fontSize: 10, fontWeight: '700', color: DARK },
    bubble: { maxWidth: '74%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe: { backgroundColor: ORANGE, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextMe: { color: '#fff' },
    bubbleTextThem: { color: DARK },
    msgTime: { fontSize: 10, color: GRAY, marginTop: 3, alignSelf: 'flex-end' },
    msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
    emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8 },
    emptyChatText: { color: '#B9BFCE', fontWeight: '600', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: DARK, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { backgroundColor: '#FFD6B0' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    menuContent: { backgroundColor: '#fff', borderRadius: 24, width: '100%', padding: 24, alignItems: 'center' },
    menuTitle: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 4 },
    menuSubTitle: { fontSize: 14, color: GRAY, marginBottom: 24 },
    menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuBtnText: { fontSize: 16, fontWeight: '700', color: DARK },
    menuBtnSub: { fontSize: 12, color: GRAY, marginTop: 1 },
    cancelBtn: { marginTop: 16, width: '100%', paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
