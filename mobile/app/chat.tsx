import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, StatusBar, Linking, Alert,
    Modal, TouchableWithoutFeedback
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

const MOCK_PASSENGER_ID = 'b91f4b80-60a6-4c40-9a29-0ec69348cafc';
const MOCK_PASSENGER_NAME = 'John';

interface Message {
    id: string;
    senderId: string;
    senderRole: 'passenger' | 'driver';
    senderName: string;
    message: string;
    createdAt: string;
}

export default function ChatScreen() {
    const { tripId, driverName, driverPhone, vehicleMake, vehiclePlate, fare, destName } =
        useLocalSearchParams<{ tripId: string; driverName: string; driverPhone: string; vehicleMake: string; vehiclePlate: string; fare: string; destName: string }>();

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const listRef = useRef<FlatList>(null);
    const router = useRouter();

    const loadMessages = useCallback(async () => {
        try {
            const res = await apiClient.get(`/trips/${tripId}/messages`);
            setMessages(res.data.messages ?? []);
        } catch { /* silent */ }
    }, [tripId]);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 4000);
        return () => clearInterval(interval);
    }, [loadMessages]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setText('');
        setSending(true);
        try {
            await apiClient.post(`/trips/${tripId}/messages`, {
                senderId: MOCK_PASSENGER_ID,
                senderRole: 'passenger',
                senderName: MOCK_PASSENGER_NAME,
                message: trimmed,
            });
            loadMessages();
        } catch {
            Alert.alert('Error', 'Could not send message');
        } finally {
            setSending(false);
        }
    };

    const handleCall = () => {
        setShowCallMenu(true);
    };

    const handleCarrierCall = () => {
        setShowCallMenu(false);
        if (!driverPhone) return;
        Linking.openURL(`tel:${driverPhone}`).catch(() =>
            Alert.alert('Cannot call', 'Unable to open phone dialer')
        );
    };

    const handleInAppCall = () => {
        setShowCallMenu(false);
        router.push({
            pathname: '/calling' as any,
            params: { driverName, vehicleMake, vehiclePlate, driverPhone }
        });
    };

    const scrollToEnd = () => {
        if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    };

    useEffect(scrollToEnd, [messages.length]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderRole === 'passenger';
        return (
            <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                {!isMe && (
                    <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarText}>{item.senderName.split(' ').map((n: string) => n[0]).join('')}</Text>
                    </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.message}</Text>
                    <Text style={[styles.msgTime, isMe ? { color: 'rgba(255,255,255,0.6)' } : {}]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={DARK} />
                </TouchableOpacity>

                <View style={styles.driverInfo}>
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>{(driverName ?? '??').split(' ').map((n: string) => n[0]).join('')}</Text>
                    </View>
                    <View>
                        <Text style={styles.driverName}>{driverName}</Text>
                        <Text style={styles.vehicleText}>{vehicleMake} · {vehiclePlate}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                    <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── Ride Info Banner ── */}
            <View style={styles.rideBanner}>
                <View style={styles.rideBannerItem}>
                    <MaterialCommunityIcons name="map-marker" size={14} color={ORANGE} />
                    <Text style={styles.rideBannerText} numberOfLines={1}>{destName}</Text>
                </View>
                <View style={styles.rideBannerDivider} />
                <View style={styles.rideBannerItem}>
                    <MaterialCommunityIcons name="cash" size={14} color={ORANGE} />
                    <Text style={styles.rideBannerText}>${fare}</Text>
                </View>
                <View style={styles.rideBannerDivider} />
                <View style={[styles.rideBannerItem, styles.statusBadge]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Confirmed</Text>
                </View>
            </View>

            {/* ── Messages ── */}
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={m => m.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyChat}>
                        <MaterialCommunityIcons name="chat-outline" size={36} color="#DDD" />
                        <Text style={styles.emptyChatText}>Say hi to your driver!</Text>
                    </View>
                }
            />

            {/* ── Input Bar ── */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Message your driver..."
                    placeholderTextColor={GRAY}
                    multiline
                    maxLength={300}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!text.trim() || sending}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── Call Menu Modal ── */}
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
                                <Text style={styles.menuTitle}>How would you like to call?</Text>
                                <Text style={styles.menuSubTitle}>{driverName}</Text>

                                <TouchableOpacity style={styles.menuBtn} onPress={handleCarrierCall}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#F0F9FF' }]}>
                                        <MaterialCommunityIcons name="cellphone" size={24} color="#0EA5E9" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuBtnText}>Carrier Call</Text>
                                        <Text style={styles.menuBtnSub}>Standard mobile network call</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={GRAY} />
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.menuBtn, { borderBottomWidth: 0 }]} onPress={handleInAppCall}>
                                    <View style={[styles.menuIcon, { backgroundColor: ORANGE_LIGHT }]}>
                                        <MaterialCommunityIcons name="phone-outline" size={24} color={ORANGE} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.menuBtnText}>In-App Call</Text>
                                        <Text style={styles.menuBtnSub}>Free internet call via ShicShic</Text>
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
    root: { flex: 1, backgroundColor: '#F7F7F9' },

    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    driverInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: ORANGE_LIGHT, borderWidth: 2, borderColor: ORANGE, justifyContent: 'center', alignItems: 'center' },
    avatarSmallText: { fontSize: 13, fontWeight: '800', color: ORANGE },
    driverName: { fontSize: 15, fontWeight: '700', color: DARK },
    vehicleText: { fontSize: 11, color: GRAY },
    callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', shadowColor: '#22C55E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },

    rideBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
    rideBannerItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    rideBannerText: { fontSize: 12, fontWeight: '600', color: DARK, flex: 1 },
    rideBannerDivider: { width: 1, height: 16, backgroundColor: '#EBEBEB' },
    statusBadge: { flex: 0.8 },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
    statusText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },

    messageList: { padding: 16, gap: 8 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
    msgRowRight: { justifyContent: 'flex-end' },
    msgRowLeft: { justifyContent: 'flex-start' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    msgAvatarText: { fontSize: 10, fontWeight: '700', color: DARK },
    bubble: { maxWidth: '72%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe: { backgroundColor: ORANGE, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextMe: { color: '#fff' },
    bubbleTextThem: { color: DARK },
    msgTime: { fontSize: 10, color: GRAY, marginTop: 3, alignSelf: 'flex-end' },

    emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
    emptyChatText: { color: '#CCC', fontWeight: '600', fontSize: 14 },

    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: DARK, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, justifyContent: 'center', alignItems: 'center', shadowColor: ORANGE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
    sendBtnDisabled: { backgroundColor: '#FFD6B0', shadowOpacity: 0 },

    // Modal Styles
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
