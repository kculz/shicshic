import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, StatusBar, Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

export default function ProfileScreen() {
    const { user, updateUser } = useAuthStore();
    const isDriver = user?.role === 'driver';
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [fullName, setFullName] = useState('');
    const [vMake, setVMake] = useState('');
    const [vModel, setVModel] = useState('');
    const [vPlate, setVPlate] = useState('');
    const [vColor, setVColor] = useState('');
    const [vRadius, setVRadius] = useState('5');
    const [kycStatus, setKycStatus] = useState('');

    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!user?.id) return;
        try {
            const res = await apiClient.get(`/profiles/${user.id}`);
            const p = res.data;
            setFullName(p.fullName || '');
            setVMake(p.vehicleMake || '');
            setVModel(p.vehicleModel || '');
            setVPlate(p.vehiclePlate || '');
            setVColor(p.vehicleColor || '');
            setVRadius(String(p.searchRadius || 5));
            setKycStatus(p.kycStatus);
        } catch (e) {
            console.error('Fetch profile failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Required', 'Full Name is required');
            return;
        }

        setSaving(true);
        try {
            const res = await apiClient.put(`/profiles/${user?.id}`, {
                fullName: fullName.trim(),
                vehicleMake: vMake.trim(),
                vehicleModel: vModel.trim(),
                vehiclePlate: vPlate.trim(),
                vehicleColor: vColor.trim(),
                searchRadius: parseInt(vRadius) || 5,
            });
            
            // Update local store if needed
            updateUser({ fullName: fullName.trim() });
            
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={ORANGE} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Edit Profile', headerTitleStyle: { fontWeight: '800' } }} />
            <StatusBar barStyle="dark-content" />
            
            <ScrollView contentContainerStyle={styles.scroll}>
                
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <MaterialCommunityIcons name="account" size={50} color={ORANGE} />
                    </View>
                    <Text style={styles.phone}>{user?.phoneNumber}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: isDriver ? '#EEF2FF' : '#F0FDF4' }]}>
                        <Text style={[styles.roleText, { color: isDriver ? '#4338CA' : '#16A34A' }]}>
                            {user?.role?.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <MaterialCommunityIcons 
                            name={kycStatus === 'approved' ? 'check-decagram' : 'clock-outline'} 
                            size={24} 
                            color={kycStatus === 'approved' ? '#22C55E' : '#F59E0B'} 
                        />
                        <View>
                            <Text style={styles.statusTitle}>Verification Status</Text>
                            <Text style={styles.statusDesc}>
                                {kycStatus === 'approved' ? 'Account Verified' : 'Pending Verification'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Basic Info */}
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={fullName} 
                            onChangeText={setFullName}
                            placeholder="Your name"
                        />
                    </View>
                </View>

                {/* Vehicle Info (Drivers only) */}
                {isDriver && (
                    <>
                        <Text style={styles.sectionTitle}>Vehicle Details</Text>
                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Vehicle Make</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={vMake} 
                                    onChangeText={setVMake}
                                    placeholder="e.g. Toyota"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Vehicle Model</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={vModel} 
                                    onChangeText={setVModel}
                                    placeholder="e.g. Vitz"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Plate Number</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={vPlate} 
                                    onChangeText={setVPlate}
                                    autoCapitalize="characters"
                                    placeholder="ABC 1234"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={vColor} 
                                    onChangeText={setVColor}
                                    placeholder="e.g. White"
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Preferences</Text>
                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Search Radius (km)</Text>
                                <View style={styles.radiusInputRow}>
                                    <TextInput 
                                        style={[styles.input, { flex: 1 }]} 
                                        value={vRadius} 
                                        onChangeText={setVRadius}
                                        keyboardType="numeric"
                                        placeholder="5"
                                    />
                                    <Text style={styles.unitText}>KM</Text>
                                </View>
                                <Text style={styles.inputHint}>How far you want to see ride requests from your location.</Text>
                            </View>
                        </View>
                    </>
                )}

                <TouchableOpacity 
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                    useAuthStore.getState().logout();
                    router.replace('/(auth)/login');
                }}>
                    <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
                
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 24 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: ORANGE },
    phone: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 11, fontWeight: '800' },
    statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: ORANGE },
    statusTitle: { fontSize: 12, color: GRAY, fontWeight: '600' },
    statusDesc: { fontSize: 15, fontWeight: '700', color: DARK },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: GRAY, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 6 },
    input: { backgroundColor: '#F7F7F9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: DARK, borderWidth: 1, borderColor: '#EEE' },
    saveBtn: { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    logoutBtn: { paddingVertical: 16, alignItems: 'center' },
    logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
    radiusInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    unitText: { fontSize: 14, fontWeight: '700', color: GRAY },
    inputHint: { fontSize: 11, color: GRAY, marginTop: 6, lineHeight: 15 },
});
