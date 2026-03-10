import React, { useState } from 'react';
import {
    StyleSheet, Text, TouchableOpacity, View, ScrollView,
    Image, ActivityIndicator, Alert, StatusBar, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const GREEN = '#22C55E';

const steps = ['ID Card', 'Selfie', 'Review'];

export default function KYCScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const [idCardFront, setIdCardFront] = useState<string | null>(null);
    const [selfie, setSelfie] = useState<string | null>(null);
    const [step, setStep] = useState(0); // 0=id, 1=selfie, 2=review
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const pickImage = async (type: 'id' | 'selfie') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant access to your photos to upload documents.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === 'id' ? [4, 3] : [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (type === 'id') {
                setIdCardFront(result.assets[0].uri);
                setStep(1); // advance to selfie step
            } else {
                setSelfie(result.assets[0].uri);
                setStep(2); // advance to review step
            }
        }
    };

    const takeSelfie = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera access to take your selfie.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            cameraType: ImagePicker.CameraType.front,
        });

        if (!result.canceled) {
            setSelfie(result.assets[0].uri);
            setStep(2);
        }
    };

    const handleSubmit = async () => {
        if (!idCardFront || !selfie) {
            Alert.alert('Incomplete', 'Please upload both your ID card and selfie');
            return;
        }

        if (!userId) {
            Alert.alert('Error', 'Session error. Please restart the registration.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('idCardFront', {
                uri: idCardFront,
                name: 'id_front.jpg',
                type: 'image/jpeg',
            } as any);
            formData.append('selfie', {
                uri: selfie,
                name: 'selfie.jpg',
                type: 'image/jpeg',
            } as any);

            const response = await apiClient.post(`/profiles/${userId}/verify`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const status = response.data?.profile?.kycStatus;
            const msg = status === 'approved'
                ? '✅ Identity Verified!\nYour account is fully verified.'
                : '⏳ Submitted for Review\nWe\'ll notify you once verified (usually within 24h).';

            Alert.alert('KYC Submitted', msg, [
                { text: 'Continue to App', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Verification?',
            'You can complete identity verification later from your Profile. Some features may be limited.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Skip for Now', style: 'default', onPress: () => router.replace('/(tabs)') }
            ]
        );
    };

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                {/* Header */}
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={DARK} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSkip} style={styles.skipTopBtn}>
                        <Text style={styles.skipTopText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={styles.titleArea}>
                    <View style={styles.shieldWrap}>
                        <MaterialCommunityIcons name="shield-check-outline" size={36} color={ORANGE} />
                    </View>
                    <Text style={styles.title}>Identity Verification</Text>
                    <Text style={styles.subtitle}>Verify your identity to unlock all features. This takes less than 2 minutes.</Text>
                </View>

                {/* Progress Steps */}
                <View style={styles.stepsRow}>
                    {steps.map((s, i) => {
                        const done = i < step;
                        const active = i === step;
                        return (
                            <React.Fragment key={s}>
                                <View style={styles.stepItem}>
                                    <View style={[
                                        styles.stepCircle,
                                        done && styles.stepCircleDone,
                                        active && styles.stepCircleActive,
                                    ]}>
                                        {done
                                            ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                                            : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                                        }
                                    </View>
                                    <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}>{s}</Text>
                                </View>
                                {i < steps.length - 1 && (
                                    <View style={[styles.stepLine, done && styles.stepLineDone]} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </View>

                {/* Step 0 — ID Card */}
                {step === 0 && (
                    <View style={styles.stepContent}>
                        <View style={styles.docCard}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={48} color={GRAY} />
                            <Text style={styles.docTitle}>National ID Card</Text>
                            <Text style={styles.docDesc}>Upload the front of your national ID, passport, or driver's licence</Text>
                        </View>
                        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('id')} activeOpacity={0.85}>
                            <MaterialCommunityIcons name="upload" size={20} color="#fff" />
                            <Text style={styles.uploadBtnText}>Upload ID Card Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 1 — Selfie */}
                {step === 1 && (
                    <View style={styles.stepContent}>
                        {/* Show uploaded ID as thumbnail */}
                        {idCardFront && (
                            <View style={styles.previewWrap}>
                                <Image source={{ uri: idCardFront }} style={styles.previewThumb} />
                                <View style={styles.doneBadge}>
                                    <MaterialCommunityIcons name="check-circle" size={20} color={GREEN} />
                                    <Text style={styles.doneBadgeText}>ID Card Uploaded</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.docCard}>
                            <MaterialCommunityIcons name="face-recognition" size={48} color={GRAY} />
                            <Text style={styles.docTitle}>Take a Selfie</Text>
                            <Text style={styles.docDesc}>Take a clear selfie of your face. Remove glasses and ensure good lighting.</Text>
                        </View>

                        <View style={styles.selfieButtonRow}>
                            <TouchableOpacity style={[styles.uploadBtn, styles.selfieBtn]} onPress={takeSelfie} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                                <Text style={styles.uploadBtnText}>Take Selfie</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.uploadBtn, styles.galleryBtn]} onPress={() => pickImage('selfie')} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="image-outline" size={20} color={ORANGE} />
                                <Text style={[styles.uploadBtnText, { color: ORANGE }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Step 2 — Review */}
                {step === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.reviewTitle}>Review Your Documents</Text>

                        <View style={styles.reviewRow}>
                            <View style={styles.reviewCard}>
                                {idCardFront
                                    ? <Image source={{ uri: idCardFront }} style={styles.reviewImg} />
                                    : <MaterialCommunityIcons name="card-account-details-outline" size={32} color={GRAY} />
                                }
                                <TouchableOpacity style={styles.reuploadBtn} onPress={() => { setIdCardFront(null); setStep(0); }}>
                                    <MaterialCommunityIcons name="refresh" size={14} color={ORANGE} />
                                    <Text style={styles.reuploadText}>Redo</Text>
                                </TouchableOpacity>
                                <Text style={styles.reviewCardLabel}>ID Card</Text>
                            </View>

                            <View style={styles.reviewCard}>
                                {selfie
                                    ? <Image source={{ uri: selfie }} style={styles.reviewImg} />
                                    : <MaterialCommunityIcons name="face-recognition" size={32} color={GRAY} />
                                }
                                <TouchableOpacity style={styles.reuploadBtn} onPress={() => { setSelfie(null); setStep(1); }}>
                                    <MaterialCommunityIcons name="refresh" size={14} color={ORANGE} />
                                    <Text style={styles.reuploadText}>Redo</Text>
                                </TouchableOpacity>
                                <Text style={styles.reviewCardLabel}>Selfie</Text>
                            </View>
                        </View>

                        <View style={styles.noticeBanner}>
                            <MaterialCommunityIcons name="lock-outline" size={16} color="#444" />
                            <Text style={styles.noticeText}>Your data is encrypted and only used for verification purposes.</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <>
                                    <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>Submit for Verification</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* Skip Bottom CTA */}
                <TouchableOpacity style={styles.skipBottomBtn} onPress={handleSkip} disabled={loading}>
                    <Text style={styles.skipBottomText}>I'll complete this later</Text>
                </TouchableOpacity>

            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 40,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center', alignItems: 'center',
    },
    skipTopBtn: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },
    skipTopText: { color: GRAY, fontSize: 14, fontWeight: '600' },
    titleArea: { alignItems: 'center', marginBottom: 32 },
    shieldWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: ORANGE_LIGHT,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: '800', color: DARK, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 22 },
    stepsRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 32,
        paddingHorizontal: 8,
    },
    stepItem: { alignItems: 'center', flex: 1 },
    stepCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    stepCircleActive: { backgroundColor: ORANGE },
    stepCircleDone: { backgroundColor: GREEN },
    stepNum: { fontSize: 12, fontWeight: '700', color: GRAY },
    stepNumActive: { color: '#fff' },
    stepLabel: { fontSize: 11, color: GRAY, fontWeight: '500' },
    stepLabelActive: { color: ORANGE, fontWeight: '700' },
    stepLabelDone: { color: GREEN, fontWeight: '700' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },
    stepLineDone: { backgroundColor: GREEN },
    stepContent: { flex: 1 },
    docCard: {
        backgroundColor: '#FAFAFA', borderRadius: 20, padding: 28,
        alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0',
        marginBottom: 20,
    },
    docTitle: { fontSize: 18, fontWeight: '700', color: DARK, marginTop: 12, marginBottom: 6 },
    docDesc: { fontSize: 13, color: GRAY, textAlign: 'center', lineHeight: 20 },
    uploadBtn: {
        backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
    },
    uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    previewWrap: { marginBottom: 16 },
    previewThumb: { width: '100%', height: 100, borderRadius: 12, resizeMode: 'cover' },
    doneBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 8, marginLeft: 2,
    },
    doneBadgeText: { color: GREEN, fontSize: 13, fontWeight: '600' },
    selfieButtonRow: { flexDirection: 'row', gap: 12 },
    selfieBtn: { flex: 1 },
    galleryBtn: {
        flex: 0.5, backgroundColor: ORANGE_LIGHT,
        shadowOpacity: 0, elevation: 0,
    },
    reviewTitle: { fontSize: 17, fontWeight: '700', color: DARK, marginBottom: 16 },
    reviewRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    reviewCard: {
        flex: 1, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
        overflow: 'hidden', alignItems: 'center', backgroundColor: '#FAFAFA',
    },
    reviewImg: { width: '100%', height: 110, resizeMode: 'cover' },
    reuploadBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingVertical: 8, paddingHorizontal: 12,
        backgroundColor: ORANGE_LIGHT,
    },
    reuploadText: { color: ORANGE, fontSize: 12, fontWeight: '600' },
    reviewCardLabel: { fontSize: 12, fontWeight: '600', color: GRAY, paddingVertical: 8 },
    noticeBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 20,
    },
    noticeText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
    submitBtn: {
        backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
    },
    submitBtnDisabled: { backgroundColor: '#FFB885', shadowOpacity: 0, elevation: 0 },
    submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    skipBottomBtn: { alignItems: 'center', marginTop: 24 },
    skipBottomText: { color: GRAY, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
