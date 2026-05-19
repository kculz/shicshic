import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Location from 'expo-location';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const ORANGE = '#FF6B00';
const DARK = '#1A1A2E';

const INCIDENT_TYPES = [
    { label: 'Accident', value: 'accident', icon: 'car-crash' },
    { label: 'Theft', value: 'theft', icon: 'hand-back-right-outline' },
    { label: 'Assault', value: 'assault', icon: 'hand-back-left-outline' },
    { label: 'Harassment', value: 'harassment', icon: 'account-cancel-outline' },
    { label: 'Damage', value: 'damage', icon: 'hammer-wrench' },
    { label: 'Fraud', value: 'fraud', icon: 'card-account-details-outline' },
    { label: 'Unsafe Driving', value: 'unsafe-driving', icon: 'speedometer' },
    { label: 'Kidnapping', value: 'kidnapping', icon: 'account-alert-outline' },
    { label: 'Robbery', value: 'robbery', icon: 'shield-off-outline' },
    { label: 'Other', value: 'other', icon: 'dots-horizontal-circle-outline' },
];

export default function ReportIncidentScreen() {
    const { user } = useAuthStore();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const router = useRouter();

    const [type, setType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let loc = await Location.getCurrentPositionAsync({});
            setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        })();
    }, []);

    const handleSubmit = async () => {
        if (!type) {
            Alert.alert('Error', 'Please select incident type');
            return;
        }
        if (description.length < 10) {
            Alert.alert('Error', 'Please provide a more detailed description');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/incidents', {
                tripId,
                reporterId: user?.id,
                type,
                description,
                locationLat: location?.lat,
                locationLon: location?.lon
            });

            Alert.alert(
                'Incident Reported',
                'Your report has been submitted to our security team. Help is on the way if this is an emergency.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to submit report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.root} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ 
                title: 'Report Incident',
                headerTintColor: DARK,
                headerTitleStyle: { fontWeight: '800' }
            }} />
            
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.emergencyBox}>
                    <MaterialCommunityIcons name="alert-decagram" size={24} color="#fff" />
                    <Text style={styles.emergencyText}>If this is a life-threatening emergency, please call local emergency services immediately.</Text>
                </View>

                <Text style={styles.sectionTitle}>What happened?</Text>
                <View style={styles.typeGrid}>
                    {INCIDENT_TYPES.map((item) => (
                        <TouchableOpacity 
                            key={item.value} 
                            style={[
                                styles.typeItem, 
                                type === item.value && styles.typeItemActive
                            ]} 
                            onPress={() => setType(item.value)}
                        >
                            <MaterialCommunityIcons 
                                name={item.icon as any} 
                                size={28} 
                                color={type === item.value ? '#fff' : DARK} 
                            />
                            <Text style={[
                                styles.typeLabel,
                                type === item.value && styles.typeLabelActive
                            ]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Description</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Provide as much detail as possible..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    value={description}
                    onChangeText={setDescription}
                />

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={ORANGE} />
                    <Text style={styles.infoText}>
                        {location ? 'Current location captured automatically' : 'Capturing location...'}
                    </Text>
                </View>

                {tripId && (
                    <View style={styles.infoBox}>
                        <MaterialCommunityIcons name="car" size={16} color={ORANGE} />
                        <Text style={styles.infoText}>Linked to current trip: {tripId.slice(0, 8)}...</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Report</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    container: { padding: 20 },
    emergencyBox: { backgroundColor: '#EF4444', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 24 },
    emergencyText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 16 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    typeItem: { width: '31%', aspectRatio: 1, backgroundColor: '#F3F4F6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 8 },
    typeItemActive: { backgroundColor: ORANGE },
    typeLabel: { fontSize: 11, fontWeight: '700', color: DARK, textAlign: 'center' },
    typeLabelActive: { color: '#fff' },
    input: { backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16, fontSize: 15, color: DARK, textAlignVertical: 'top', minHeight: 120, marginBottom: 20 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    infoText: { fontSize: 12, color: '#666', fontWeight: '500' },
    submitBtn: { backgroundColor: DARK, borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
