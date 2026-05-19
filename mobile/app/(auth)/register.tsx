import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import apiClient from '../../api/client';
import { normalizePhoneNumber } from '../../utils/phone';

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
    summary: 'Save Home, Work, and other regular destinations for faster booking.',
  },
  {
    key: 'driver',
    label: 'Driver',
    desc: 'Offer rides and earn',
    icon: 'steering' as const,
    summary: 'Accept nearby requests and keep your day organized in one place.',
  },
] as const;

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params.role === 'driver' || params.role === 'passenger') {
      setRole(params.role);
    }
  }, [params.role]);

  const activeRole = ROLES.find((item) => item.key === role) ?? ROLES[0];

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter your full name and phone number');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const response = await apiClient.post('/users/register', {
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        role,
      });

      const user = response.data as { id: string };

      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: normalizedPhone, userId: user.id },
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={DARK} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Set up the basics now, then verify your identity when you are ready.</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name={activeRole.icon} size={26} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{activeRole.label} setup</Text>
            <Text style={styles.summaryText}>{activeRole.summary}</Text>
          </View>
        </View>

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {ROLES.map((item) => {
            const selected = role === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
                onPress={() => setRole(item.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.roleIconBox, selected && styles.roleIconBoxSelected]}>
                  <MaterialCommunityIcons name={item.icon} size={26} color={selected ? '#fff' : GRAY} />
                </View>
                <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{item.label}</Text>
                <Text style={[styles.roleDesc, selected && styles.roleDescSelected]}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Moyo"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor={GRAY}
            autoCapitalize="words"
          />
        </View>

        <Text style={[styles.label, { marginTop: 8 }]}>Phone Number</Text>
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

        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={18} color={ORANGE} />
          <Text style={styles.infoBannerText}>
            We will send an OTP code to confirm this number. Identity verification can be finished after you enter the app.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

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
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: DARK, marginBottom: 6 },
  subtitle: { fontSize: 15, color: GRAY, lineHeight: 22 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD6B0',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 4 },
  summaryText: { fontSize: 12, color: '#8B4500', lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  roleCardSelected: { borderColor: ORANGE, backgroundColor: ORANGE_LIGHT },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleIconBoxSelected: { backgroundColor: ORANGE },
  roleLabel: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  roleLabelSelected: { color: ORANGE },
  roleDesc: { fontSize: 12, color: GRAY, textAlign: 'center' },
  roleDescSelected: { color: '#D05500' },
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#8B4500', lineHeight: 19 },
  button: {
    backgroundColor: ORANGE,
    borderRadius: 16,
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
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: GRAY, fontSize: 15 },
  footerLink: { color: ORANGE, fontSize: 15, fontWeight: '700' },
});
