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

export default function LoginScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert('Required', 'Please enter your phone number');
            return;
        }
        setLoading(true);
        try {
            // For prototype: check if user exists then go to OTP
            await new Promise(r => setTimeout(r, 800)); // simulate network
            router.push({
                pathname: '/(auth)/otp',
                params: { phoneNumber }
            });
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Login failed. Please try again.');
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
                {/* Logo Area */}
                <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                        <MaterialCommunityIcons name="car-connected" size={44} color={ORANGE} />
                    </View>
                    <Text style={styles.appName}>ShicShic</Text>
                    <Text style={styles.tagline}>Ride. Connect. Arrive.</Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome Back 👋</Text>
                    <Text style={styles.cardDesc}>Log in with your registered phone number</Text>

                    <Text style={styles.label}>Phone Number</Text>
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

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>Send OTP Code</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={styles.footerLink}> Sign Up</Text>
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
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: ORANGE_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    appName: {
        fontSize: 32,
        fontWeight: '800',
        color: DARK,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: GRAY,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: DARK,
        marginBottom: 6,
    },
    cardDesc: {
        fontSize: 14,
        color: GRAY,
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: DARK,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8E8E8',
        borderRadius: 12,
        backgroundColor: '#fff',
        marginBottom: 20,
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
    button: {
        backgroundColor: ORANGE,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
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
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 28,
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
