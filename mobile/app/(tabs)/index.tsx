import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList,
  Alert, View, Text, StatusBar, Platform, Modal, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import ApiClient from '../../api/client';
import LeafletMap from '../../components/LeafletMap';
import FareOfferModal from '../../components/FareOfferModal';


const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';

const MOCK_USER = { name: 'John', kycStatus: 'pending' };

const SERVICES = [
  { icon: 'car', label: 'Ride', desc: 'Book a ride', color: '#FF6B00', bg: '#FFF3EA' },
  { icon: 'car-multiple', label: 'Share', desc: 'Shared ride', color: '#6366F1', bg: '#EEF2FF' },
];

const QUICK_PLACES = [
  { icon: 'home-outline', label: 'Home', address: '123 Harare Central', color: '#22C55E', lat: -17.8292, lon: 31.0522 },
  { icon: 'briefcase-outline', label: 'Work', address: 'CBD, Harare', color: '#6366F1', lat: -17.8312, lon: 31.0490 },
  { icon: 'star-outline', label: 'Gym', address: 'Avondale, Harare', color: '#F59E0B', lat: -17.8150, lon: 31.0410 },
];

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen() {
  const [selectedService, setSelectedService] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [fareModalOpen, setFareModalOpen] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);


  // Search
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Locations
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLon, setDestLon] = useState<number | null>(null);
  const [destName, setDestName] = useState('');

  const searchRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Get user's current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLat(loc.coords.latitude);
      setUserLon(loc.coords.longitude);
    })();
  }, []);

  // Debounced Nominatim search
  const searchPlaces = useCallback((text: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) { setSuggestions([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ' Zimbabwe')}&limit=5&countrycodes=zw`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'ShicShicApp/1.0' }
        });
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const selectSuggestion = (s: Suggestion) => {
    setDestLat(parseFloat(s.lat));
    setDestLon(parseFloat(s.lon));
    // Shorten the display name
    const short = s.display_name.split(',').slice(0, 2).join(',').trim();
    setDestName(short);
    setSearchText(short);
    setSuggestions([]);
  };

  const selectQuickPlace = (p: typeof QUICK_PLACES[0]) => {
    setDestLat(p.lat);
    setDestLon(p.lon);
    setDestName(p.address);
    setSearchText(p.address);
    setMapOpen(true);
  };

  const handleRequestRide = async () => {
    if (!destName || !userLat || !userLon || !destLat || !destLon) return;
    setLoading(true);
    try {
      // Calculate approximate distance (crow flies)
      const d = Math.sqrt(Math.pow(destLat - userLat, 2) + Math.pow(destLon - userLon, 2)) * 111;
      setDistanceKm(d || 5);

      const passengerId = '5fcc714f-3064-45a5-8b2b-2d096e26a45a'; // Valid ID from DB
      const res = await ApiClient.post('/trips/request', {
        passengerId,
        pickupLocation: `${userLat},${userLon}`,
        destinationLocation: destName,
        isShared: selectedService === 1,
      });

      setTripId(res.data.trip.id);
      setFareModalOpen(true);
    } catch (error: any) {
      console.error('Ride initiation failed:', error);
      const detail = error.response?.data?.error || error.message;
      Alert.alert('Error', `Could not initiate ride: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBidsReady = (tId: string, fare: number) => {
    setFareModalOpen(false);
    setMapOpen(false);
    router.push({
      pathname: '/bidding' as any,
      params: { tripId: tId, passengerFare: String(fare), destName }
    });
  };


  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Main Scroll Content ── */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}, {MOCK_USER.name} 👋</Text>
            <Text style={styles.subGreeting}>Where are you heading?</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={DARK} />
          </TouchableOpacity>
        </View>

        {/* KYC Banner */}
        {MOCK_USER.kycStatus !== 'approved' && (
          <TouchableOpacity style={styles.kycAlert} onPress={() => router.push('/(auth)/kyc')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="shield-alert-outline" size={18} color={ORANGE} />
            <Text style={styles.kycAlertText}>Complete identity verification to book rides</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={ORANGE} />
          </TouchableOpacity>
        )}

        {/* Search — opens map modal */}
        <TouchableOpacity style={styles.searchBox} onPress={() => { setMapOpen(true); setTimeout(() => searchRef.current?.focus(), 200); }} activeOpacity={0.9}>
          <View style={styles.dotOrange} />
          <Text style={[styles.searchPlaceholder, destName && styles.searchValue]} numberOfLines={1}>
            {destName || 'Where to?'}
          </Text>
          <MaterialCommunityIcons name="magnify" size={20} color={GRAY} />
        </TouchableOpacity>

        {/* Service Cards */}
        <Text style={styles.sectionTitle}>Service</Text>
        <View style={styles.serviceRow}>
          {SERVICES.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.serviceCard, selectedService === i && { borderColor: s.color, borderWidth: 2 }]}
              onPress={() => setSelectedService(i)}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceIcon, { backgroundColor: s.bg }]}>
                <MaterialCommunityIcons name={s.icon as any} size={24} color={s.color} />
              </View>
              <Text style={[styles.serviceLabel, selectedService === i && { color: s.color }]}>{s.label}</Text>
              <Text style={styles.serviceDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Places — compact horizontal pills */}
        <Text style={styles.sectionTitle}>Saved Places</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickScrollContent}>
          {QUICK_PLACES.map((p, i) => (
            <TouchableOpacity key={i} style={styles.quickPill} onPress={() => selectQuickPlace(p)} activeOpacity={0.8}>
              <View style={[styles.pillIcon, { backgroundColor: `${p.color}18` }]}>
                <MaterialCommunityIcons name={p.icon as any} size={16} color={p.color} />
              </View>
              <View>
                <Text style={styles.pillLabel}>{p.label}</Text>
                <Text style={styles.pillAddr} numberOfLines={1}>{p.address}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>


        {/* Recent Trips */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
        </View>
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="car-outline" size={32} color="#DDD" />
          <Text style={styles.emptyText}>No trips yet</Text>
        </View>

      </ScrollView>

      {/* ── Map + Search Modal ── */}
      <Modal visible={mapOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.modalRoot}>
          <StatusBar barStyle="dark-content" />

          {/* Search Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBack} onPress={() => { setMapOpen(false); setSuggestions([]); }}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={DARK} />
            </TouchableOpacity>
            <View style={styles.modalSearchRow}>
              {/* Origin pill */}
              <View style={styles.originPill}>
                <View style={styles.dotOrange} />
                <Text style={styles.originText} numberOfLines={1}>
                  {userLat ? 'My location' : 'Locating...'}
                </Text>
              </View>
              {/* Destination input */}
              <View style={styles.destInput}>
                <MaterialCommunityIcons name="map-marker" size={16} color={ORANGE} />
                <TextInput
                  ref={searchRef}
                  style={styles.destInputText}
                  placeholder="Where to?"
                  placeholderTextColor={GRAY}
                  value={searchText}
                  onChangeText={(t) => { setSearchText(t); searchPlaces(t); if (!t) { setDestLat(null); setDestLon(null); setDestName(''); } }}
                  autoFocus
                  returnKeyType="search"
                />
                {searching && <ActivityIndicator size="small" color={ORANGE} style={{ marginLeft: 4 }} />}
                {searchText.length > 0 && !searching && (
                  <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); setDestLat(null); setDestLon(null); setDestName(''); }}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={GRAY} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Suggestions overlay */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(_, i) => String(i)}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => {
                  const parts = item.display_name.split(',');
                  const title = parts[0]?.trim();
                  const sub = parts.slice(1, 3).join(',').trim();
                  return (
                    <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                      <View style={styles.suggestionIcon}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={ORANGE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>{sub}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Leaflet Map */}
          <View style={styles.mapContainer}>
            <LeafletMap
              userLat={userLat}
              userLon={userLon}
              destLat={destLat}
              destLon={destLon}
            />
          </View>

          {/* Book Button */}
          {destName && (
            <View style={styles.bookBar}>
              <View style={styles.bookDest}>
                <MaterialCommunityIcons name="map-marker" size={18} color={ORANGE} />
                <Text style={styles.bookDestText} numberOfLines={1}>{destName}</Text>
              </View>
              <TouchableOpacity
                style={[styles.bookBtn, loading && { backgroundColor: '#FFB885' }]}
                onPress={handleRequestRide}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.bookBtnText}>Confirm {SERVICES[selectedService]?.label}</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <FareOfferModal
            visible={fareModalOpen}
            tripId={tripId || ''}
            destName={destName}
            distanceKm={distanceKm}
            isShared={selectedService === 1}
            onClose={() => setFareModalOpen(false)}
            onBidsReady={handleBidsReady}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F9' },
  container: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 80 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greeting: { fontSize: 21, fontWeight: '800', color: DARK },
  subGreeting: { fontSize: 13, color: GRAY, marginTop: 1 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },

  kycAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ORANGE_LIGHT, borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFD6B0' },
  kycAlertText: { flex: 1, color: '#8B4500', fontSize: 12, fontWeight: '600' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 20, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  dotOrange: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: ORANGE },
  searchPlaceholder: { flex: 1, fontSize: 16, color: GRAY, fontWeight: '500' },
  searchValue: { color: DARK },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 10 },

  serviceRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  serviceCard: { flex: 1, alignItems: 'center', padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceLabel: { fontSize: 14, fontWeight: '700', color: DARK },
  serviceDesc: { fontSize: 11, color: GRAY, marginTop: 2 },

  quickScroll: { marginBottom: 20 },
  quickScrollContent: { gap: 10, paddingRight: 4 },
  quickPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  pillIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  pillLabel: { fontSize: 13, fontWeight: '700', color: DARK },
  pillAddr: { fontSize: 11, color: GRAY, maxWidth: 100 },

  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: ORANGE_LIGHT, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFD6B0' },
  promoTitle: { fontSize: 13, fontWeight: '800', color: DARK, marginBottom: 3 },
  promoDesc: { fontSize: 12, color: '#8B4500' },

  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#CCC' },

  // ── Modal ──
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 14, paddingBottom: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', zIndex: 10 },
  modalBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  modalSearchRow: { flex: 1, gap: 8 },
  originPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F5F5F5', borderRadius: 10 },
  originText: { fontSize: 13, color: DARK, fontWeight: '500' },
  destInput: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 10, backgroundColor: ORANGE_LIGHT },
  destInputText: { flex: 1, fontSize: 15, color: DARK, fontWeight: '500', paddingVertical: 0 },

  suggestionsBox: { position: 'absolute', top: Platform.OS === 'ios' ? 155 : 130, left: 0, right: 0, backgroundColor: '#fff', zIndex: 20, maxHeight: 260, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F7F7F7' },
  suggestionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE_LIGHT, justifyContent: 'center', alignItems: 'center' },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: DARK },
  suggestionSub: { fontSize: 12, color: GRAY, marginTop: 1 },

  mapContainer: { flex: 1 },

  bookBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 12 },
  bookDest: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookDestText: { flex: 1, fontSize: 14, fontWeight: '600', color: DARK },
  bookBtn: { backgroundColor: ORANGE, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, minWidth: 110, alignItems: 'center', shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
