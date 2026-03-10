import React, { useState, useRef } from 'react';
import {
    StyleSheet, Text, TextInput, TouchableOpacity, View,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';


const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const OTP_LENGTH = 6;

export default function OTPScreen() {
    const { phoneNumber, userId } = useLocalSearchParams<{ phoneNumber: string; userId: string }>();
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const inputs = useRef<(TextInput | null)[]>([]);
    const router = useRouter();

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        // Auto-advance
        if (text && index < OTP_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            Alert.alert('Invalid', 'Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/users/verify-otp', {
                phoneNumber,
                otp: code,
            });

            const { userId } = response.data;

            // Navigate to KYC screen with userId
            router.push({
                pathname: '/(auth)/kyc',
                params: { userId }
            });
        } catch (error: any) {
            Alert.alert('Invalid Code', error.response?.data?.error || 'Verification failed. Check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        try {
            await apiClient.post('/users/resend-otp', { phoneNumber });
            setOtp(Array(OTP_LENGTH).fill(''));
            inputs.current[0]?.focus();
            Alert.alert('Sent!', `New OTP generated. Check the backend console for the code.`);
        } catch {
            Alert.alert('Error', 'Could not resend OTP. Please try again.');
        }
    };


    const maskedPhone = phoneNumber
        ? phoneNumber.slice(0, -4).replace(/./g, '•') + phoneNumber.slice(-4)
        : '•••• ••• ••••';

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.container}>

                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={DARK} />
                </TouchableOpacity>

                {/* Icon */}
                <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name="message-text-lock-outline" size={40} color={ORANGE} />
                </View>

                <Text style={styles.title}>Check your SMS</Text>
                <Text style={styles.subtitle}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
                </Text>

                {/* OTP Boxes */}
                <View style={styles.otpRow}>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <TextInput
                            key={i}
                            ref={ref => { inputs.current[i] = ref; }}
                            style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : null]}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={otp[i]}
                            onChangeText={text => handleChange(text, i)}
                            onKeyPress={e => handleKeyPress(e, i)}
                            textAlign="center"
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Verify & Continue</Text>
                    }
                </TouchableOpacity>

                {/* Resend */}
                <View style={styles.resendRow}>
                    <Text style={styles.resendText}>Didn't receive it?</Text>
                    <TouchableOpacity onPress={resendOtp}>
                        <Text style={styles.resendLink}> Resend Code</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 56,
    },
    backBtn: {
        marginBottom: 32,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: ORANGE_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: DARK,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: GRAY,
        lineHeight: 22,
        marginBottom: 36,
    },
    phoneHighlight: {
        color: DARK,
        fontWeight: '700',
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 36,
        justifyContent: 'center',
    },
    otpBox: {
        width: 48,
        height: 56,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        fontSize: 22,
        fontWeight: '700',
        color: DARK,
        backgroundColor: '#FAFAFA',
    },
    otpBoxFilled: {
        borderColor: ORANGE,
        backgroundColor: ORANGE_LIGHT,
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
    },
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    resendText: {
        color: GRAY,
        fontSize: 15,
    },
    resendLink: {
        color: ORANGE,
        fontSize: 15,
        fontWeight: '700',
    },
});
