import React, { useState } from 'react';
import {
    StyleSheet, Text, TextInput, TouchableOpacity, View,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

const ROLES = [
    {
        key: 'passenger',
        label: 'Passenger',
        desc: 'Book rides and travel',
        icon: 'account-outline' as const,
    },
    {
        key: 'driver',
        label: 'Driver',
        desc: 'Offer rides and earn',
        icon: 'steering' as const,
    },
];

export default function RegisterScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert('Required', 'Please enter your phone number');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/users/register', {
                phoneNumber: `+263${phoneNumber.replace(/^0/, '')}`,
                role,
            });

            const user = response.data;

            // Go to OTP verification → then KYC
            router.push({
                pathname: '/(auth)/otp',
                params: { phoneNumber, userId: user.id }
            });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                {/* Header */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={DARK} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join ShicShic and start your journey today</Text>
                </View>

                {/* Role Picker */}
                <Text style={styles.label}>I am a...</Text>
                <View style={styles.roleRow}>
                    {ROLES.map(r => {
                        const selected = role === r.key;
                        return (
                            <TouchableOpacity
                                key={r.key}
                                style={[styles.roleCard, selected && styles.roleCardSelected]}
                                onPress={() => setRole(r.key as any)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.roleIconBox, selected && styles.roleIconBoxSelected]}>
                                    <MaterialCommunityIcons
                                        name={r.icon}
                                        size={28}
                                        color={selected ? '#fff' : GRAY}
                                    />
                                </View>
                                <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{r.label}</Text>
                                <Text style={[styles.roleDesc, selected && styles.roleDescSelected]}>{r.desc}</Text>
                                {selected && (
                                    <View style={styles.checkBadge}>
                                        <MaterialCommunityIcons name="check-circle" size={18} color={ORANGE} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Phone */}
                <Text style={[styles.label, { marginTop: 8 }]}>Phone Number</Text>
                <View style={styles.inputRow}>
                    <View style={styles.flagBox}>
                        <Text style={styles.flag}>🇿🇼 +263</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="77 123 4567"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholderTextColor={GRAY}
                    />
                </View>

                {/* Info banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={ORANGE} />
                    <Text style={styles.infoBannerText}>
                        You'll be asked to verify your identity after registering. You can skip this and complete it later from your profile.
                    </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Text style={styles.buttonText}>Continue</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        </>
                    }
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.footerLink}> Log In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 40,
    },
    backBtn: {
        marginBottom: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: DARK,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: GRAY,
        lineHeight: 22,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: DARK,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    roleCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#EBEBEB',
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        position: 'relative',
    },
    roleCardSelected: {
        borderColor: ORANGE,
        backgroundColor: ORANGE_LIGHT,
    },
    roleIconBox: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleIconBoxSelected: {
        backgroundColor: ORANGE,
    },
    roleLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: DARK,
        marginBottom: 2,
    },
    roleLabelSelected: {
        color: ORANGE,
    },
    roleDesc: {
        fontSize: 12,
        color: GRAY,
        textAlign: 'center',
    },
    roleDescSelected: {
        color: '#D05500',
    },
    checkBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8E8E8',
        borderRadius: 12,
        backgroundColor: '#fff',
        marginBottom: 16,
        overflow: 'hidden',
    },
    flagBox: {
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#E8E8E8',
        backgroundColor: '#F8F8F8',
    },
    flag: {
        fontSize: 15,
        color: DARK,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        color: DARK,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: ORANGE_LIGHT,
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: ORANGE,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#8B4500',
        lineHeight: 19,
    },
    button: {
        backgroundColor: ORANGE,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#FFB885',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: GRAY,
        fontSize: 15,
    },
    footerLink: {
        color: ORANGE,
        fontSize: 15,
        fontWeight: '700',
    },
});
