import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Platform, Alert, KeyboardAvoidingView,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

interface Props {
    visible: boolean;
    tripId: string;
    destName: string;
    distanceKm: number;
    isShared: boolean;
    onClose: () => void;
    onBidsReady: (tripId: string, fare: number) => void;
}

export default function FareOfferModal({ visible, tripId, destName, distanceKm, isShared, onClose, onBidsReady }: Props) {
    const [fare, setFare] = useState('');
    const [estimate, setEstimate] = useState<{ low: number; suggested: number; high: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && distanceKm > 0) {
            apiClient.get(`/trips/fare-estimate?distanceKm=${distanceKm}`)
                .then(r => {
                    setEstimate(r.data);
                    setFare(String(r.data.suggested));
                })
                .catch(() => setEstimate({ low: 1.5, suggested: 2.5, high: 3.5 }));
        }
    }, [visible, distanceKm]);

    const handleFindDrivers = async () => {
        const fareNum = parseFloat(fare);
        if (!fareNum || fareNum < 0.5) {
            Alert.alert('Invalid', 'Please enter a valid fare (minimum $0.50)');
            return;
        }
        setLoading(true);
        try {
            await apiClient.post(`/trips/${tripId}/bids/simulate`, { passengerFare: fareNum });
            onBidsReady(tripId, fareNum);
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Could not find drivers');
        } finally {
            setLoading(false);
        }
    };

    const setSuggested = (val: number) => setFare(String(val));

    if (!visible) return null;

    return (
        <View style={styles.fullscreen}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flexShrink} />
                </TouchableWithoutFeedback>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.sheet}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        <View style={styles.top}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>Set Your Offer</Text>
                                <Text style={styles.dest} numberOfLines={1}>→ {destName}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <MaterialCommunityIcons name="close" size={20} color={GRAY} />
                            </TouchableOpacity>
                        </View>

                        {/* Distance info */}
                        <View style={styles.distRow}>
                            <MaterialCommunityIcons name="map-marker-distance" size={16} color={ORANGE} />
                            <Text style={styles.distText}>~{distanceKm.toFixed(1)} km · {isShared ? 'Shared ride' : 'Private ride'}</Text>
                        </View>

                        {/* Fare Suggestions */}
                        {estimate && (
                            <>
                                <Text style={styles.label}>Others pay for this route:</Text>
                                <View style={styles.suggRow}>
                                    {[
                                        { label: 'Budget', val: estimate.low, icon: 'trending-down', color: '#22C55E' },
                                        { label: 'Suggested', val: estimate.suggested, icon: 'check-circle-outline', color: ORANGE },
                                        { label: 'Premium', val: estimate.high, icon: 'trending-up', color: '#6366F1' },
                                    ].map(s => (
                                        <TouchableOpacity
                                            key={s.label}
                                            style={[styles.suggCard, fare === String(s.val) && { borderColor: s.color, borderWidth: 2 }]}
                                            onPress={() => setSuggested(s.val)}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
                                            <Text style={[styles.suggLabel, { color: s.color }]}>{s.label}</Text>
                                            <Text style={styles.suggPrice}>${s.val}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Custom Input */}
                        <Text style={styles.label}>Your offer (USD):</Text>
                        <View style={styles.fareInput}>
                            <Text style={styles.currencySign}>$</Text>
                            <TextInput
                                style={styles.fareInputText}
                                value={fare}
                                onChangeText={setFare}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={GRAY}
                                autoFocus={false}
                            />
                        </View>

                        <Text style={styles.hint}>
                            💡 Drivers nearby will see your offer and can accept or counter it
                        </Text>

                        <TouchableOpacity
                            style={[styles.findBtn, loading && { backgroundColor: '#FFB885' }]}
                            onPress={handleFindDrivers}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <>
                                    <MaterialCommunityIcons name="car-search" size={20} color="#fff" />
                                    <Text style={styles.findBtnText}>Find Drivers</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fullscreen: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    keyboardView: { width: '100%' },
    flexShrink: { flex: 1 },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
    top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '800', color: DARK },
    dest: { fontSize: 13, color: GRAY, marginTop: 2, maxWidth: 260 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: ORANGE_LIGHT, borderRadius: 8, padding: 8 },
    distText: { fontSize: 13, color: '#8B4500', fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
    suggRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    suggCard: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#FAFAFA', gap: 4 },
    suggLabel: { fontSize: 11, fontWeight: '700' },
    suggPrice: { fontSize: 15, fontWeight: '800', color: DARK },
    fareInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: ORANGE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: ORANGE_LIGHT },
    currencySign: { fontSize: 20, fontWeight: '700', color: ORANGE, marginRight: 4 },
    fareInputText: { flex: 1, fontSize: 22, fontWeight: '800', color: DARK },
    hint: { fontSize: 12, color: GRAY, marginBottom: 20, lineHeight: 18 },
    findBtn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    findBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
