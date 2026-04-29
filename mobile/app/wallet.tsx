import React, { useState, useEffect } from 'react';
import {
    StyleSheet, TouchableOpacity, ScrollView, View,
    TextInput, ActivityIndicator, Alert, StatusBar, Platform
} from 'react-native';
import { Text } from '@/components/Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import ApiClient from '../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const GREEN = '#22C55E';

export default function WalletScreen() {
    const [balance, setBalance] = useState<number>(0);
    const [topupAmount, setTopupAmount] = useState('10');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const router = useRouter();

    const userId = 'b91f4b80-60a6-4c40-9a29-0ec69348cafc'; // Mock current user ID

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const res = await ApiClient.get(`/payments/balance/${userId}`);
            setBalance(Number(res.data.credits));
        } catch (e) {
            console.error('Fetch balance failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleTopup = async () => {
        if (!topupAmount || parseFloat(topupAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount to top up.');
            return;
        }

        setProcessing(true);
        try {
            const res = await ApiClient.post('/payments/topup', {
                userId,
                amount: parseFloat(topupAmount),
                phoneNumber: '0771234567' // In real app, get from user profile
            });

            Alert.alert(
                'Payment Initiated',
                'Please check your phone for the EcoCash USSD prompt. Your balance will update in a few seconds.',
                [{ text: 'OK', onPress: () => {
                    // Poll for balance update
                    setTimeout(fetchBalance, 6000);
                }}]
            );
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true, 
                title: 'My Wallet',
                headerTitleStyle: { fontWeight: '800' }
            }} />
            <StatusBar barStyle="dark-content" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Credits</Text>
                    <Text style={styles.balanceValue}>
                        {loading ? '...' : `$${balance.toFixed(2)}`}
                    </Text>
                    <View style={styles.currencyBadge}>
                        <Text style={styles.currencyText}>USD</Text>
                    </View>
                </View>

                {/* Top-up Section */}
                <Text style={styles.sectionTitle}>Add Credits</Text>
                <View style={styles.topupBox}>
                    <Text style={styles.topupDesc}>Top up your driver account using EcoCash</Text>
                    
                    <View style={styles.inputRow}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                            style={styles.input}
                            value={topupAmount}
                            onChangeText={setTopupAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>

                    <View style={styles.presets}>
                        {['5', '10', '20', '50'].map(amt => (
                            <TouchableOpacity 
                                key={amt} 
                                style={[styles.presetBtn, topupAmount === amt && styles.presetActive]}
                                onPress={() => setTopupAmount(amt)}
                            >
                                <Text style={[styles.presetText, topupAmount === amt && styles.presetTextActive]}>
                                    ${amt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={[styles.payBtn, processing && { opacity: 0.7 }]}
                        onPress={handleTopup}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="cellphone-wireless" size={20} color="#fff" />
                                <Text style={styles.payBtnText}>Top Up via EcoCash</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={GRAY} />
                    <Text style={styles.infoText}>
                        System charges (10%) are deducted from your credits upon ride acceptance. 
                        Ensure your balance is higher than the ride fare to accept.
                    </Text>
                </View>

                {/* Recent Transactions */}
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <View style={styles.emptyTransactions}>
                    <MaterialCommunityIcons name="history" size={40} color="#DDD" />
                    <Text style={styles.emptyText}>No recent transactions</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F9' },
    scrollContent: { padding: 20 },
    balanceCard: {
        backgroundColor: DARK,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
    balanceValue: { color: '#fff', fontSize: 42, fontWeight: '800' },
    currencyBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 12,
    },
    currencyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    
    sectionTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 16 },
    
    topupBox: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    topupDesc: { fontSize: 13, color: GRAY, marginBottom: 20 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 10,
        marginBottom: 20,
    },
    currencySymbol: { fontSize: 24, fontWeight: '800', color: DARK, marginRight: 8 },
    input: { flex: 1, fontSize: 32, fontWeight: '800', color: DARK },
    
    presets: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    presetBtn: {
        width: '22%',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#F0F0F0',
        alignItems: 'center',
    },
    presetActive: { borderColor: ORANGE, backgroundColor: ORANGE_LIGHT },
    presetText: { fontWeight: '700', color: GRAY },
    presetTextActive: { color: ORANGE },
    
    payBtn: {
        backgroundColor: ORANGE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
    },
    payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 24,
    },
    infoText: { flex: 1, fontSize: 12, color: '#4338CA', lineHeight: 18 },
    
    emptyTransactions: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        gap: 10,
    },
    emptyText: { color: '#BBB', fontSize: 14, fontWeight: '500' },
});
