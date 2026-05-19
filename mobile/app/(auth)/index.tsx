import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/useAuthStore';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

const ROLE_OPTIONS = [
  {
    key: 'passenger',
    label: 'Passenger',
    icon: 'account-outline' as const,
    title: 'Book in fewer taps',
    description: 'Save Home, Work, and your favorite places for faster ride requests.',
  },
  {
    key: 'driver',
    label: 'Driver',
    icon: 'steering' as const,
    title: 'Earn from nearby requests',
    description: 'See matching trips, bid confidently, and keep your day moving.',
  },
] as const;

export default function AuthIndex() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver'>('passenger');

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const activeRole = ROLE_OPTIONS.find((role) => role.key === selectedRole) ?? ROLE_OPTIONS[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff7f1" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="car-connected" size={34} color={ORANGE} />
            </View>
            <View>
              <Text style={styles.brand}>ShicShic</Text>
              <Text style={styles.brandSub}>Simple local rides for both sides of the trip.</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Choose how you want to use the app.</Text>
          <Text style={styles.heroText}>
            Passengers can save regular destinations and book quickly. Drivers can pick up nearby requests and earn on their schedule.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <MaterialCommunityIcons name="bookmark-outline" size={16} color={ORANGE} />
              <Text style={styles.featureChipText}>Saved places</Text>
            </View>
            <View style={styles.featureChip}>
              <MaterialCommunityIcons name="map-marker-path" size={16} color={ORANGE} />
              <Text style={styles.featureChipText}>Local trips</Text>
            </View>
            <View style={styles.featureChip}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color={ORANGE} />
              <Text style={styles.featureChipText}>Secure OTP</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>I want to continue as</Text>
        <View style={styles.roleList}>
          {ROLE_OPTIONS.map((role) => {
            const selected = selectedRole === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
                  <MaterialCommunityIcons name={role.icon} size={24} color={selected ? '#fff' : DARK} />
                </View>
                <View style={styles.roleCardCopy}>
                  <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{role.label}</Text>
                  <Text style={styles.roleDesc}>{role.description}</Text>
                </View>
                {selected ? <MaterialCommunityIcons name="check-circle" size={20} color={ORANGE} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>{activeRole.title}</Text>
          <Text style={styles.selectionText}>{activeRole.description}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push({ pathname: '/(auth)/register', params: { role: selectedRole } })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Create {selectedRole} account</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff7f1' },
  container: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ORANGE_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontSize: 28, fontWeight: '800', color: DARK },
  brandSub: { fontSize: 13, color: GRAY, lineHeight: 18, maxWidth: 210 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: DARK, lineHeight: 34, marginBottom: 10 },
  heroText: { fontSize: 14, color: GRAY, lineHeight: 22, marginBottom: 16 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: ORANGE_LIGHT,
  },
  featureChipText: { fontSize: 12, fontWeight: '700', color: '#8B4500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: DARK,
    marginBottom: 10,
  },
  roleList: { gap: 12, marginBottom: 16 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
  },
  roleCardSelected: {
    borderColor: ORANGE,
    backgroundColor: '#fffaf6',
  },
  roleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconWrapSelected: { backgroundColor: ORANGE },
  roleCardCopy: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 4 },
  roleLabelSelected: { color: ORANGE },
  roleDesc: { fontSize: 12, color: GRAY, lineHeight: 18 },
  selectionCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  selectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  selectionText: { fontSize: 13, color: '#D4D7E3', lineHeight: 20 },
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 18,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E7E7',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: DARK },
});
