import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import apiClient from '../../api/client';
import { normalizePhoneNumber } from '../../utils/phone';

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
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const response = await apiClient.post('/users/register', {
        phoneNumber: normalizedPhone,
        role: 'passenger',
      });

      const user = response.data as { id: string };

      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: normalizedPhone, userId: user.id },
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
        <TouchableOpacity onPress={() => router.push('/(auth)')} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={DARK} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="cellphone-message" size={34} color={ORANGE} />
          </View>
          <Text style={styles.title}>Log in with your phone number</Text>
          <Text style={styles.subtitle}>
            Passengers and drivers use the same secure OTP flow, so you can get back into the app quickly.
          </Text>
        </View>

        <View style={styles.featureStrip}>
          <View style={styles.featurePill}>
            <MaterialCommunityIcons name="account-switch-outline" size={16} color={ORANGE} />
            <Text style={styles.featurePillText}>Passenger or driver</Text>
          </View>
          <View style={styles.featurePill}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={ORANGE} />
            <Text style={styles.featurePillText}>OTP verified</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputRow}>
            <View style={styles.flagBox}>
              <Text style={styles.flag}>ZW +263</Text>
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

          <View style={styles.helperCard}>
            <MaterialCommunityIcons name="information-outline" size={18} color={ORANGE} />
            <Text style={styles.helperText}>We will send a one-time code to this number so you can continue.</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Send OTP Code</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Need a new account?</Text>
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
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 22,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: { marginBottom: 18 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: ORANGE_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 28, fontWeight: '800', color: DARK, marginBottom: 8, lineHeight: 36 },
  subtitle: { fontSize: 15, color: GRAY, lineHeight: 22 },
  featureStrip: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#FFD6B0',
  },
  featurePillText: { fontSize: 12, fontWeight: '700', color: '#8B4500' },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
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
    borderRadius: 14,
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
  flag: { fontSize: 15, color: DARK, fontWeight: '700' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: DARK,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  helperText: { flex: 1, fontSize: 13, color: '#8B4500', lineHeight: 19 },
  button: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: GRAY, fontSize: 15 },
  footerLink: { color: ORANGE, fontSize: 15, fontWeight: '700' },
});
