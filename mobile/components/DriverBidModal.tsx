import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ApiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

interface DriverBidModalProps {
    visible: boolean;
    trip: any;
    onClose: () => void;
    onBidPlaced: () => void;
}

export default function DriverBidModal({ visible, trip, onClose, onBidPlaced }: DriverBidModalProps) {
    const { user } = useAuthStore();
    const [fare, setFare] = useState('');
    const [eta, setEta] = useState('5');
    const [loading, setLoading] = useState(false);

    const handlePlaceBid = async () => {
        if (!fare || isNaN(Number(fare))) {
            Alert.alert('Invalid Fare', 'Please enter a valid fare amount.');
            return;
        }

        setLoading(true);
        try {
            await ApiClient.post(`/trips/${trip.id}/bids`, {
                driverId: user?.id,
                offeredFare: Number(fare),
                estimatedArrivalMins: Number(eta),
            });
            Alert.alert('Bid Placed', 'Your offer has been sent to the passenger.');
            onBidPlaced();
            onClose();
        } catch (error: any) {
            console.error('[BidModal] Error:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || 'Could not place bid';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    if (!trip) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Place Your Bid</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={DARK} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tripPreview}>
                        <View style={styles.tripRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={18} color={ORANGE} />
                            <Text style={styles.tripText} numberOfLines={1}>{trip.pickupLocation}</Text>
                        </View>
                        <View style={styles.tripRow}>
                            <MaterialCommunityIcons name="map-marker" size={18} color={ORANGE} />
                            <Text style={styles.tripText} numberOfLines={1}>{trip.destinationLocation}</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Your Fare Offer (USD)</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currency}>$</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                value={fare}
                                onChangeText={setFare}
                                autoFocus
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Estimated Arrival (Minutes)</Text>
                        <View style={styles.etaRow}>
                            {['3', '5', '10', '15'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.etaPill, eta === t && styles.etaPillActive]}
                                    onPress={() => setEta(t)}
                                >
                                    <Text style={[styles.etaText, eta === t && styles.etaTextActive]}>{t} min</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.bidBtn, loading && { opacity: 0.7 }]}
                        onPress={handlePlaceBid}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bidBtnText}>Send Offer</Text>}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800', color: DARK },
    tripPreview: { backgroundColor: '#F7F7F9', padding: 12, borderRadius: 12, gap: 8, marginBottom: 24 },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tripText: { fontSize: 13, color: GRAY, flex: 1 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F9', borderRadius: 12, paddingHorizontal: 16, height: 56 },
    currency: { fontSize: 18, fontWeight: '700', color: DARK, marginRight: 4 },
    input: { flex: 1, fontSize: 18, fontWeight: '700', color: DARK },
    etaRow: { flexDirection: 'row', gap: 8 },
    etaPill: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F7F7F9', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    etaPillActive: { backgroundColor: '#FFF3EA', borderColor: ORANGE },
    etaText: { fontSize: 13, fontWeight: '600', color: GRAY },
    etaTextActive: { color: ORANGE },
    bidBtn: { backgroundColor: ORANGE, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    bidBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
