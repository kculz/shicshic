import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Image, View, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const GREEN = '#22C55E';

// For prototype use a hardcoded mock; real app would read from auth store
const MOCK_USER = {
  id: 'b91f4b80-60a6-4c40-9a29-0ec69348cafc',
  name: 'John Doe',
  phone: '+263 77 123 4567',
  role: 'passenger' as 'passenger' | 'driver',
  kycStatus: 'pending' as 'pending' | 'approved' | 'rejected',
  initials: 'JD',
};

type MenuItem = {
  icon: string;
  label: string;
  desc?: string;
  action: () => void;
  danger?: boolean;
  badge?: string;
};

export default function ProfileScreen() {
  const router = useRouter();

  const kycDone = MOCK_USER.kycStatus === 'approved';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => router.replace('/(auth)/login') }
    ]);
  };

  const menuItems: MenuItem[] = [
    ...(!kycDone ? [{
      icon: 'shield-account-outline',
      label: 'Complete Identity Verification',
      desc: 'Unlock all features by verifying your ID',
      badge: 'Required',
      action: () => router.push({ pathname: '/(auth)/kyc', params: { userId: MOCK_USER.id } }),
    }] : []),
    {
      icon: 'account-edit-outline',
      label: 'Edit Profile',
      desc: 'Update your name and details',
      action: () => Alert.alert('Coming Soon', 'Profile editing coming soon.'),
    },
    {
      icon: 'bell-outline',
      label: 'Notifications',
      desc: 'Manage alerts and push notifications',
      action: () => Alert.alert('Coming Soon', 'Notification settings coming soon.'),
    },
    {
      icon: 'shield-lock-outline',
      label: 'Privacy & Security',
      action: () => Alert.alert('Coming Soon', 'Privacy settings coming soon.'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      action: () => Alert.alert('Coming Soon', 'Support centre coming soon.'),
    },
    {
      icon: 'logout',
      label: 'Log Out',
      danger: true,
      action: handleLogout,
    },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <View style={styles.hero}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{MOCK_USER.initials}</Text>
            </View>
            {kycDone && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={20} color={GREEN} />
              </View>
            )}
          </View>

          <Text style={styles.heroName}>{MOCK_USER.name}</Text>
          <Text style={styles.heroPhone}>{MOCK_USER.phone}</Text>

          {/* Role pill */}
          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name={MOCK_USER.role === 'driver' ? 'steering' : 'account-outline'}
              size={14} color={ORANGE}
            />
            <Text style={styles.rolePillText}>
              {MOCK_USER.role === 'driver' ? 'Driver' : 'Passenger'}
            </Text>
          </View>
        </View>

        {/* KYC Status Banner */}
        {!kycDone ? (
          <TouchableOpacity
            style={styles.kycBanner}
            onPress={() => router.push({ pathname: '/(auth)/kyc', params: { userId: MOCK_USER.id } })}
            activeOpacity={0.88}
          >
            <View style={styles.kycBannerLeft}>
              <MaterialCommunityIcons name="shield-alert-outline" size={28} color={ORANGE} />
              <View style={{ flex: 1 }}>
                <Text style={styles.kycBannerTitle}>Verify Your Identity</Text>
                <Text style={styles.kycBannerDesc}>Upload your ID and selfie to unlock full access</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={ORANGE} />
          </TouchableOpacity>
        ) : (
          <View style={styles.kycVerifiedBanner}>
            <MaterialCommunityIcons name="shield-check" size={22} color={GREEN} />
            <Text style={styles.kycVerifiedText}>Identity Verified</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Trips', value: '0' },
            { label: 'Rating', value: '—' },
            { label: 'Member since', value: 'Mar 2026' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statItemBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.action}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIcon, item.danger && styles.menuIconDanger, item.badge && styles.menuIconOrange]}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.danger ? '#EF4444' : item.badge ? ORANGE : '#555'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
                  {item.desc && <Text style={styles.menuDesc}>{item.desc}</Text>}
                </View>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                {!item.badge && (
                  <MaterialCommunityIcons name="chevron-right" size={20} color={item.danger ? '#EF4444' : '#CCC'} />
                )}
              </TouchableOpacity>
              {i < menuItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.version}>ShicShic v1.0.0</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: ORANGE_LIGHT,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: ORANGE,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: ORANGE },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 12, padding: 1,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 3 },
  heroPhone: { fontSize: 14, color: GRAY, marginBottom: 10 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ORANGE_LIGHT, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  rolePillText: { fontSize: 13, color: ORANGE, fontWeight: '700' },
  kycBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ORANGE_LIGHT,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#FFD6B0',
  },
  kycBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  kycBannerTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  kycBannerDesc: { fontSize: 12, color: '#8B4500', lineHeight: 17 },
  kycVerifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  kycVerifiedText: { fontSize: 14, fontWeight: '700', color: GREEN },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statItemBorder: { borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  statValue: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 2 },
  statLabel: { fontSize: 11, color: GRAY, fontWeight: '500' },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 20,
    marginHorizontal: 16, marginTop: 12, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  menuIconDanger: { backgroundColor: '#FEE2E2' },
  menuIconOrange: { backgroundColor: ORANGE_LIGHT },
  menuLabel: { fontSize: 15, fontWeight: '600', color: DARK },
  menuLabelDanger: { color: '#EF4444' },
  menuDesc: { fontSize: 12, color: GRAY, marginTop: 1 },
  menuBadge: {
    backgroundColor: ORANGE_LIGHT, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginLeft: 'auto',
  },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: ORANGE },
  divider: { height: 1, backgroundColor: '#F3F3F3', marginLeft: 66 },
  version: { textAlign: 'center', color: GRAY, fontSize: 12, marginVertical: 24 },
});
