import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import ApiClient from '../../api/client';
import DriverBidModal from '../../components/DriverBidModal';
import FareOfferModal from '../../components/FareOfferModal';
import LeafletMap from '../../components/LeafletMap';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../store/useTripStore';

const ORANGE = '#FF6B00';
const ORANGE_LIGHT = '#FFF3EA';
const DARK = '#1A1A2E';
const GRAY = '#8A8FA8';
const SURFACE = '#FFFFFF';
const BG = '#F7F7F9';

const SERVICES = [
  { icon: 'car', label: 'Ride', desc: 'Private trip', color: '#FF6B00', bg: '#FFF3EA' },
  { icon: 'car-multiple', label: 'Share', desc: 'Lower fare', color: '#2563EB', bg: '#EAF2FF' },
] as const;

const BUILT_IN_PLACES = [
  { id: 'home', icon: 'home-variant-outline', label: 'Home', color: '#22C55E', bg: '#F0FDF4' },
  { id: 'work', icon: 'briefcase-outline', label: 'Work', color: '#6366F1', bg: '#EEF2FF' },
] as const;

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface SavedPlace {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
}

interface ProfileData {
  fullName?: string | null;
  homeAddress?: string | null;
  homeLat?: number | null;
  homeLon?: number | null;
  workAddress?: string | null;
  workLat?: number | null;
  workLon?: number | null;
  savedPlaces?: SavedPlace[];
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_started';
}

interface TripCardData {
  id: string;
  status: string;
  pickupLocation: string;
  destinationLocation: string;
  pickupLat: number;
  pickupLon: number;
  destLat: number;
  destLon: number;
  fare?: number;
}

type SelectionTarget = 'pickup' | 'destination';
type MapFlow = 'trip' | 'save_only' | 'save_and_use';

type SettingPlace =
  | { type: 'home' }
  | { type: 'work' }
  | { type: 'custom'; label: string; id?: string }
  | null;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const toShortAddress = (displayName: string) =>
  displayName.split(',').slice(0, 2).join(',').trim();

const getSettingLabel = (settingPlace: SettingPlace) => {
  if (!settingPlace) return null;
  if (settingPlace.type === 'custom') return settingPlace.label;
  return settingPlace.type === 'home' ? 'Home' : 'Work';
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { availableTrips, currentTrip, fetchAvailableTrips, syncActiveTrip, loading: tripsLoading } = useTripStore();
  const isDriver = user?.role === 'driver';

  const [selectedService, setSelectedService] = useState(0);
  const [shareSeats, setShareSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [fareModalOpen, setFareModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [customPlaceLabel, setCustomPlaceLabel] = useState('');
  const [editingCustomPlaceId, setEditingCustomPlaceId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pinResolving, setPinResolving] = useState(false);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLon, setPickupLon] = useState<number | null>(null);
  const [pickupName, setPickupName] = useState('Current location');
  const [pickupUsesCurrent, setPickupUsesCurrent] = useState(true);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLon, setDestLon] = useState<number | null>(null);
  const [destName, setDestName] = useState('');
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripCardData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [settingPlace, setSettingPlace] = useState<SettingPlace>(null);
  const [mapTarget, setMapTarget] = useState<SelectionTarget>('destination');
  const [mapFlow, setMapFlow] = useState<MapFlow>('trip');

  const searchRef = useRef<TextInput | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedTripIdRef = useRef<string | null>(null);
  const router = useRouter();

  const savedPlaces = profile?.savedPlaces ?? [];
  const pickupReady = pickupLat !== null && pickupLon !== null;
  const destinationReady = destLat !== null && destLon !== null && !!destName;
  const rideReady = pickupReady && destinationReady;

  const pickupSummary = pickupUsesCurrent
    ? pickupReady
      ? 'Current location'
      : 'Waiting for your current location'
    : pickupName || 'Choose a pickup point';

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Needed', 'You can still book rides, but you may need to pin your pickup point manually.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLat(location.coords.latitude);
      setUserLon(location.coords.longitude);
    })().catch((error) => {
      console.error('Location fetch failed', error);
    });
  }, []);

  useEffect(() => {
    if (!pickupUsesCurrent) return;
    if (userLat === null || userLon === null) return;

    setPickupLat(userLat);
    setPickupLon(userLon);
    setPickupName('Current location');
  }, [pickupUsesCurrent, userLat, userLon]);

  useEffect(() => {
    if (!user?.id) return;

    ApiClient.get(`/profiles/${user.id}`)
      .then((response) => {
        const nextProfile = response.data as ProfileData;
        setProfile(nextProfile);
        useAuthStore.getState().updateUser({
          kycStatus: nextProfile.kycStatus,
          isVerified: nextProfile.kycStatus === 'approved',
        });
      })
      .catch((error) => {
        console.error('Failed to sync profile', error);
      });
  }, [user?.id]);

  const saveProfileUpdate = async (payload: Partial<ProfileData>) => {
    if (!user?.id) throw new Error('User not found');

    const response = await ApiClient.put(`/profiles/${user.id}`, payload);
    const nextProfile = response.data as ProfileData;
    setProfile(nextProfile);
    return nextProfile;
  };

  const searchPlaces = useCallback((text: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `${text} Zimbabwe`
        )}&limit=5&countrycodes=zw`;

        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'ShicShicApp/1.0',
          },
        });

        const data = (await response.json()) as Suggestion[];
        setSuggestions(data);
      } catch (error) {
        console.error('Search failed', error);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'ShicShicApp/1.0',
      },
    });

    const data = (await response.json()) as { display_name?: string };
    return data.display_name ? toShortAddress(data.display_name) : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }, []);

  const applyDestination = (address: string, lat: number, lon: number) => {
    setDestName(address);
    setDestLat(lat);
    setDestLon(lon);
  };

  const applyPickup = (address: string, lat: number, lon: number, usesCurrent: boolean) => {
    setPickupName(address);
    setPickupLat(lat);
    setPickupLon(lon);
    setPickupUsesCurrent(usesCurrent);
  };

  const clearSearchInput = () => {
    setSearchText('');
    setSuggestions([]);
  };

  const clearDestination = () => {
    setDestName('');
    setDestLat(null);
    setDestLon(null);
  };

  const closeMap = () => {
    setMapOpen(false);
    setSettingPlace(null);
    setMapFlow('trip');
    setSuggestions([]);
    setSearchText('');
    setPinResolving(false);
  };

  const openMapPicker = (
    target: SelectionTarget,
    placeToSet: SettingPlace = null,
    flow: MapFlow = 'trip'
  ) => {
    setMapTarget(target);
    setSettingPlace(placeToSet);
    setMapFlow(flow);
    setSuggestions([]);
    setSearchText('');
    setMapOpen(true);
  };

  const openCustomPlaceModal = (place?: SavedPlace) => {
    setEditingCustomPlaceId(place?.id ?? null);
    setCustomPlaceLabel(place?.label ?? '');
    setLabelModalOpen(true);
  };

  const continueCustomPlaceSetup = () => {
    const label = customPlaceLabel.trim();
    if (!label) {
      Alert.alert('Label Required', 'Give this place a short label like Gym, School, or Auntie.');
      return;
    }

    if (editingCustomPlaceId) {
      const existingPlace = savedPlaces.find((place) => place.id === editingCustomPlaceId);
      if (!existingPlace) {
        Alert.alert('Place Missing', 'We could not find that saved place. Please try again.');
        return;
      }

      const nextSavedPlaces = savedPlaces
        .map((place) => (place.id === editingCustomPlaceId ? { ...place, label } : place))
        .sort((first, second) => first.label.localeCompare(second.label));

      setLabelModalOpen(false);
      void saveProfileUpdate({ savedPlaces: nextSavedPlaces })
        .then(() => {
          Alert.alert('Place Updated', `${label} is ready to use.`);
        })
        .catch((error: any) => {
          const detail = error.response?.data?.error || error.message;
          Alert.alert('Update Failed', `We could not update that place. ${detail}`);
        });
      return;
    }

    const nextSettingPlace: Exclude<SettingPlace, null> = { type: 'custom', label };

    setLabelModalOpen(false);
    openMapPicker('destination', nextSettingPlace, 'save_only');
  };

  const saveConfiguredPlace = async (address: string, lat: number, lon: number, config: Exclude<SettingPlace, null>) => {
    if (config.type === 'home') {
      await saveProfileUpdate({ homeAddress: address, homeLat: lat, homeLon: lon });
      return 'Home';
    }

    if (config.type === 'work') {
      await saveProfileUpdate({ workAddress: address, workLat: lat, workLon: lon });
      return 'Work';
    }

    const nextPlace: SavedPlace = {
      id: config.id ?? `saved-${Date.now()}`,
      label: config.label,
      address,
      lat,
      lon,
    };

    const nextSavedPlaces = [
      ...savedPlaces.filter((place) => place.id !== nextPlace.id),
      nextPlace,
    ].sort((first, second) => first.label.localeCompare(second.label));

    await saveProfileUpdate({ savedPlaces: nextSavedPlaces });
    return config.label;
  };

  const handleResolvedSelection = async (address: string, lat: number, lon: number) => {
    if (settingPlace) {
      const shouldUsePlaceForTrip = mapFlow === 'save_and_use';
      if (shouldUsePlaceForTrip) {
        applyDestination(address, lat, lon);
      }

      try {
        const savedLabel = await saveConfiguredPlace(address, lat, lon, settingPlace);
        Alert.alert('Place Saved', `${savedLabel} is ready for quick ride requests.`);
      } catch (error: any) {
        const detail = error.response?.data?.error || error.message;
        Alert.alert('Save Failed', `We selected the place, but could not save it. ${detail}`);
      } finally {
        closeMap();
      }

      return;
    }

    if (mapTarget === 'pickup') {
      applyPickup(address, lat, lon, false);
    } else {
      applyDestination(address, lat, lon);
    }

    closeMap();
  };

  const selectSuggestion = async (suggestion: Suggestion) => {
    const lat = Number.parseFloat(suggestion.lat);
    const lon = Number.parseFloat(suggestion.lon);
    const shortAddress = toShortAddress(suggestion.display_name);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      Alert.alert('Selection Error', 'We could not use that place. Please try another result.');
      return;
    }

    await handleResolvedSelection(shortAddress, lat, lon);
  };

  const handleMapPress = async ({ lat, lon }: { lat: number; lon: number }) => {
    setPinResolving(true);

    try {
      const address = await reverseGeocode(lat, lon);
      await handleResolvedSelection(address, lat, lon);
    } catch (error) {
      console.error('Reverse geocode failed', error);
      Alert.alert('Pin Error', 'We could not read that pinned location. Please try again.');
    } finally {
      setPinResolving(false);
    }
  };

  const useCurrentLocationAsPickup = () => {
    if (userLat === null || userLon === null) {
      Alert.alert('Current Location Unavailable', 'Please allow location access or pin a pickup point on the map.');
      return;
    }

    applyPickup('Current location', userLat, userLon, true);
    closeMap();
  };

  const selectBuiltInPlace = (type: 'home' | 'work') => {
    const address = type === 'home' ? profile?.homeAddress : profile?.workAddress;
    const lat = type === 'home' ? profile?.homeLat : profile?.workLat;
    const lon = type === 'home' ? profile?.homeLon : profile?.workLon;

    if (!address || lat === null || lat === undefined || lon === null || lon === undefined) {
      openMapPicker('destination', { type }, 'save_and_use');
      return;
    }

    applyDestination(address, lat, lon);
  };

  const selectCustomPlace = (place: SavedPlace) => {
    applyDestination(place.address, place.lat, place.lon);
  };

  const handleRequestRide = async () => {
    if (!user?.id) {
      Alert.alert('Account Error', 'Please log in again before requesting a ride.');
      return;
    }

    if (!rideReady || pickupLat === null || pickupLon === null || destLat === null || destLon === null) {
      Alert.alert('Trip Details Needed', 'Choose both a pickup point and a destination before requesting a ride.');
      return;
    }

    setLoading(true);
    try {
      const distance = Math.sqrt(Math.pow(destLat - pickupLat, 2) + Math.pow(destLon - pickupLon, 2)) * 111;
      setDistanceKm(distance || 5);

      const response = await ApiClient.post('/trips/request', {
        passengerId: user.id,
        pickupLocation: pickupName || (pickupUsesCurrent ? 'Current location' : 'Pinned pickup'),
        destinationLocation: destName,
        pickupLat,
        pickupLon,
        destLat,
        destLon,
        isShared: selectedService === 1,
        seatsRequested: selectedService === 1 ? shareSeats : 1,
      });

      setTripId((response.data as { trip: { id: string } }).trip.id);
      setFareModalOpen(true);
    } catch (error: any) {
      console.error('Ride initiation failed:', error);
      const detail = error.response?.data?.error || error.message;
      Alert.alert('Error', `Could not initiate ride: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBidsReady = (nextTripId: string, fare: number) => {
    setFareModalOpen(false);
    router.push({
      pathname: '/bidding' as const,
      params: { tripId: nextTripId, passengerFare: String(fare), destName },
    });
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const runFetch = () => {
      if (userLat !== null && userLon !== null) {
        void fetchAvailableTrips(userLat, userLon, user?.id);
        return;
      }

      void fetchAvailableTrips();
    };

    if (isDriver) {
      runFetch();
      interval = setInterval(runFetch, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchAvailableTrips, isDriver, user?.id, userLat, userLon]);

  useEffect(() => {
    if (!user?.id) return;

    const connectToActiveTrip = async () => {
      try {
        const trip = await syncActiveTrip(user.id);
        if (!trip) {
          connectedTripIdRef.current = null;
          return;
        }

        if (connectedTripIdRef.current === trip.id || currentTrip?.id === trip.id) {
          connectedTripIdRef.current = trip.id;
          return;
        }

        connectedTripIdRef.current = trip.id;
        router.push({
          pathname: '/chat' as const,
          params: { tripId: trip.id },
        });
      } catch (error) {
        console.error('Active trip session poll failed', error);
      }
    };

    void connectToActiveTrip();
    const interval = setInterval(() => {
      void connectToActiveTrip();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentTrip?.id, router, syncActiveTrip, user?.id]);

  const handleBidOnTrip = (trip: TripCardData) => {
    setSelectedTrip(trip);
    setBidModalOpen(true);
  };

  if (isDriver) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting()}, {user?.fullName || 'Driver'}</Text>
              <Text style={styles.subGreeting}>You are online and ready for trips</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.driverStats}>
            <View style={styles.driverStatItem}>
              <Text style={styles.driverStatValue}>0</Text>
              <Text style={styles.driverStatLabel}>Today's Trips</Text>
            </View>
            <View style={styles.driverStatItem}>
              <Text style={styles.driverStatValue}>$0.00</Text>
              <Text style={styles.driverStatLabel}>Earnings</Text>
            </View>
          </View>

          {!user?.isVerified && user?.kycStatus === 'pending' && (
            <View style={styles.pendingBanner}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#8B4500" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Documents Under Review</Text>
                <Text style={styles.pendingDesc}>Your submission is being reviewed. This usually takes less than 24 hours.</Text>
              </View>
            </View>
          )}

          {!user?.isVerified && (user?.kycStatus === 'not_started' || !user?.kycStatus) && (
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => router.push({ pathname: '/(auth)/kyc', params: { userId: user?.id } })}
            >
              <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#8B4500" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Action Required: Complete KYC</Text>
                <Text style={styles.pendingDesc}>Please upload your ID and vehicle details to start accepting rides.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#8B4500" />
            </TouchableOpacity>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Requests</Text>
            <TouchableOpacity onPress={() => void fetchAvailableTrips()}>
              <MaterialCommunityIcons name="refresh" size={20} color={ORANGE} />
            </TouchableOpacity>
          </View>

          {tripsLoading ? (
            <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 40 }} />
          ) : availableTrips.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="car-search" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No active requests in your area</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => void fetchAvailableTrips()}>
                <Text style={styles.refreshBtnText}>Check Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            availableTrips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.9}>
                <View style={styles.tripCardHeader}>
                  <Text style={styles.tripStatusPill}>NEW REQUEST</Text>
                  <Text style={styles.tripTime}>Just now</Text>
                </View>
                <View style={styles.tripPath}>
                  <View style={styles.pathIndicator}>
                    <View style={styles.dotOrange} />
                    <View style={styles.pathLine} />
                    <MaterialCommunityIcons name="map-marker" size={16} color={ORANGE} />
                  </View>
                  <View style={styles.pathText}>
                    <Text style={styles.pathLabel} numberOfLines={1}>{trip.pickupLocation}</Text>
                    <Text style={styles.pathLabel} numberOfLines={1}>{trip.destinationLocation}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleBidOnTrip(trip)}>
                  <Text style={styles.acceptBtnText}>Bid on this Trip</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          <DriverBidModal
            visible={bidModalOpen}
            trip={selectedTrip}
            onClose={() => setBidModalOpen(false)}
            onBidPlaced={() => void fetchAvailableTrips()}
          />
        </ScrollView>
      </View>
    );
  }

  const mapTitle = settingPlace
    ? `Save ${getSettingLabel(settingPlace)}`
    : mapTarget === 'pickup'
      ? 'Choose Pickup Point'
      : 'Choose Destination';

  const mapSubtitle = settingPlace
    ? 'Search for the place or tap the map to pin it and save it.'
    : mapTarget === 'pickup'
      ? 'Use your current location, search, or tap the map to pin a different pickup point.'
      : 'Search for the destination or tap the map to pin where you want to go.';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}, {user?.fullName || 'Passenger'}</Text>
            <Text style={styles.subGreeting}>Choose pickup and destination your way, then request a ride.</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={DARK} />
          </TouchableOpacity>
        </View>

        {user?.kycStatus !== 'approved' && (
          <TouchableOpacity style={styles.kycAlert} onPress={() => router.push('/(auth)/kyc')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="shield-alert-outline" size={18} color={ORANGE} />
            <Text style={styles.kycAlertText}>Complete identity verification to book rides</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={ORANGE} />
          </TouchableOpacity>
        )}

        <View style={styles.plannerCard}>
          <View style={styles.plannerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.plannerEyebrow}>Plan a trip</Text>
              <Text style={styles.plannerTitle}>Search, save, or pin both your pickup point and destination.</Text>
            </View>
            <TouchableOpacity style={styles.mapShortcut} onPress={() => openMapPicker('destination')}>
              <MaterialCommunityIcons name="map-search-outline" size={18} color={ORANGE} />
              <Text style={styles.mapShortcutText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickActionChip, pickupUsesCurrent && styles.quickActionChipSelected]}
              onPress={useCurrentLocationAsPickup}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={16}
                color={pickupUsesCurrent ? ORANGE : DARK}
              />
              <Text style={[styles.quickActionChipText, pickupUsesCurrent && styles.quickActionChipTextSelected]}>
                Use current pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionChip} onPress={() => openMapPicker('pickup')} activeOpacity={0.85}>
              <MaterialCommunityIcons name="map-marker-plus-outline" size={16} color={DARK} />
              <Text style={styles.quickActionChipText}>Pick another pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionChip} onPress={() => openMapPicker('destination')} activeOpacity={0.85}>
              <MaterialCommunityIcons name="map-marker-path" size={16} color={DARK} />
              <Text style={styles.quickActionChipText}>Pick on map</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeCard}>
            <TouchableOpacity style={styles.routeStopButton} onPress={() => openMapPicker('pickup')} activeOpacity={0.85}>
              <View style={[styles.routeDot, styles.originDot]} />
              <View style={styles.routeCopy}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={[styles.routeValue, !pickupReady && styles.routePlaceholder]}>{pickupSummary}</Text>
              </View>
              <View style={styles.routeActionPill}>
                <Text style={styles.routeActionText}>{pickupUsesCurrent ? 'Current' : 'Change'}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.routeDivider} />

            <TouchableOpacity style={styles.routeStopButton} onPress={() => openMapPicker('destination')} activeOpacity={0.85}>
              <View style={[styles.routeDot, styles.destinationDot]} />
              <View style={styles.routeCopy}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={[styles.routeValue, !destName && styles.routePlaceholder]}>
                  {destName || 'Choose Home, Work, a saved place, or pin on the map'}
                </Text>
              </View>
              {destName ? (
                <TouchableOpacity style={styles.clearDestinationBtn} onPress={clearDestination}>
                  <MaterialCommunityIcons name="close" size={16} color={GRAY} />
                </TouchableOpacity>
              ) : (
                <View style={styles.routeActionPill}>
                  <Text style={styles.routeActionText}>Select</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.serviceRow}>
            {SERVICES.map((service, index) => {
              const selected = selectedService === index;
              return (
                <TouchableOpacity
                  key={service.label}
                  style={[
                    styles.serviceCard,
                    selected && { borderColor: service.color, backgroundColor: service.bg },
                  ]}
                  onPress={() => setSelectedService(index)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: selected ? '#fff' : service.bg }]}>
                    <MaterialCommunityIcons name={service.icon as any} size={22} color={service.color} />
                  </View>
                  <View style={styles.serviceCopy}>
                    <Text style={[styles.serviceLabel, selected && { color: service.color }]}>{service.label}</Text>
                    <Text style={styles.serviceDesc}>{service.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedService === 1 ? (
            <View style={styles.shareRideCard}>
              <View style={styles.shareRideHeader}>
                <View style={styles.shareRideIcon}>
                  <MaterialCommunityIcons name="account-group-outline" size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareRideTitle}>Shared ride details</Text>
                  <Text style={styles.shareRideText}>
                    Choose how many seats you need so we can match you with nearby riders going the same way.
                  </Text>
                </View>
              </View>

              <View style={styles.shareSeatRow}>
                {[1, 2, 3].map((seatCount) => {
                  const selected = shareSeats === seatCount;
                  return (
                    <TouchableOpacity
                      key={seatCount}
                      style={[styles.shareSeatChip, selected && styles.shareSeatChipSelected]}
                      onPress={() => setShareSeats(seatCount)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.shareSeatChipValue, selected && styles.shareSeatChipValueSelected]}>
                        {seatCount}
                      </Text>
                      <Text style={[styles.shareSeatChipText, selected && styles.shareSeatChipTextSelected]}>
                        {seatCount === 1 ? 'Seat' : 'Seats'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryAction, !rideReady && styles.primaryActionDisabled]}
            onPress={handleRequestRide}
            disabled={!rideReady || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryActionText}>
                  {rideReady ? `Request ${SERVICES[selectedService].label}` : 'Choose pickup and destination first'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.plannerHint}>
            {selectedService === 1
              ? `Tip: shared rides use your selected ${shareSeats === 1 ? 'seat' : 'seats'} count to find a matching trip with nearby passengers.`
              : 'Tip: you can search for a place or tap directly on the map to pin the exact destination yourself.'}
          </Text>
        </View>

        <View style={styles.savedPlacesHeader}>
          <Text style={styles.sectionTitle}>Saved Places</Text>
          <TouchableOpacity style={styles.savedPlacesAddBtn} onPress={() => openCustomPlaceModal()}>
            <MaterialCommunityIcons name="plus" size={16} color={ORANGE} />
            <Text style={styles.savedPlacesAddText}>Add place</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedPlacesRow}>
          {BUILT_IN_PLACES.map((place) => {
            const address = place.id === 'home' ? profile?.homeAddress : profile?.workAddress;
            return (
              <TouchableOpacity
                key={place.id}
                style={[styles.savedPlaceCard, !address && styles.savedPlaceCardEmpty]}
                onPress={() => selectBuiltInPlace(place.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.savedPlaceIcon, { backgroundColor: place.bg }]}>
                  <MaterialCommunityIcons name={place.icon as any} size={18} color={place.color} />
                </View>
                <Text style={styles.savedPlaceLabel}>{place.label}</Text>
                <Text style={styles.savedPlaceAddress} numberOfLines={2}>
                  {address || `Tap to save your ${place.label.toLowerCase()} address`}
                </Text>
                <Text style={[styles.savedPlaceMeta, { color: place.color }]}>
                  {address ? 'Tap to use' : 'Set place'}
                </Text>
              </TouchableOpacity>
            );
          })}

          {savedPlaces.map((place) => (
            <View key={place.id} style={styles.savedPlaceCard}>
              <View style={styles.customPlaceHeader}>
                <TouchableOpacity style={styles.customPlaceSummary} onPress={() => selectCustomPlace(place)} activeOpacity={0.85}>
                  <View style={[styles.savedPlaceIcon, styles.customPlaceIcon]}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={DARK} />
                  </View>
                  <Text style={styles.savedPlaceLabel}>{place.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customPlaceEditBtn} onPress={() => openCustomPlaceModal(place)}>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={GRAY} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => selectCustomPlace(place)} activeOpacity={0.85}>
                <Text style={styles.savedPlaceAddress} numberOfLines={2}>{place.address}</Text>
                <Text style={[styles.savedPlaceMeta, { color: ORANGE }]}>Tap to use</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addPlaceCard} onPress={() => openCustomPlaceModal()} activeOpacity={0.85}>
            <View style={styles.addPlaceIcon}>
              <MaterialCommunityIcons name="plus" size={22} color={ORANGE} />
            </View>
            <Text style={styles.addPlaceTitle}>Save another place</Text>
            <Text style={styles.addPlaceText}>Store school, church, gym, family, or any regular stop.</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
        </View>
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={30} color="#D1D5DB" />
          <Text style={styles.emptyTextDark}>Tap the pickup row to change where the driver should collect you.</Text>
          <Text style={styles.emptySubText}>Tap the destination row to search or pin where you want to go.</Text>
        </View>
      </ScrollView>

      <Modal visible={mapOpen} animationType="slide" statusBarTranslucent>
        <View style={styles.modalRoot}>
          <StatusBar barStyle="dark-content" />

          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBack} onPress={closeMap}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={DARK} />
            </TouchableOpacity>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle}>{mapTitle}</Text>
              <Text style={styles.modalSubtitle}>{mapSubtitle}</Text>
            </View>
          </View>

          {mapTarget === 'pickup' && !settingPlace ? (
            <View style={styles.pickupModeBar}>
              <TouchableOpacity
                style={[styles.pickupModeBtn, pickupUsesCurrent && styles.pickupModeBtnSelected]}
                onPress={useCurrentLocationAsPickup}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color={pickupUsesCurrent ? ORANGE : DARK} />
                <Text style={[styles.pickupModeBtnText, pickupUsesCurrent && styles.pickupModeBtnTextSelected]}>
                  Use current location
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.modalSearchWrap}>
            <View style={styles.destInput}>
              <MaterialCommunityIcons name={mapTarget === 'pickup' ? 'map-marker-radius-outline' : 'map-marker'} size={16} color={ORANGE} />
              <TextInput
                ref={searchRef}
                style={styles.destInputText}
                placeholder={mapTarget === 'pickup' ? 'Search for pickup point' : 'Search for destination'}
                placeholderTextColor={GRAY}
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  searchPlaces(text);
                }}
                returnKeyType="search"
              />
              {searching ? <ActivityIndicator size="small" color={ORANGE} /> : null}
              {!!searchText && !searching ? (
                <TouchableOpacity onPress={clearSearchInput}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={GRAY} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.selectionSummaryCard}>
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>Pickup</Text>
              <Text style={styles.selectionSummaryValue} numberOfLines={1}>{pickupSummary}</Text>
            </View>
            <View style={styles.selectionSummaryRow}>
              <Text style={styles.selectionSummaryLabel}>Destination</Text>
              <Text style={styles.selectionSummaryValue} numberOfLines={1}>
                {destName || 'Not selected yet'}
              </Text>
            </View>
          </View>

          {settingPlace ? (
            <View style={styles.savingBanner}>
              <MaterialCommunityIcons name="bookmark-outline" size={18} color={ORANGE} />
              <Text style={styles.savingBannerText}>
                The next place you choose will be saved as {getSettingLabel(settingPlace)}.
              </Text>
            </View>
          ) : null}

          {pinResolving ? (
            <View style={styles.pinBanner}>
              <ActivityIndicator size="small" color={ORANGE} />
              <Text style={styles.pinBannerText}>Reading the pinned location...</Text>
            </View>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(_, index) => String(index)}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => {
                  const parts = item.display_name.split(',');
                  const title = parts[0]?.trim() || item.display_name;
                  const sub = parts.slice(1, 3).join(',').trim();
                  return (
                    <TouchableOpacity style={styles.suggestionItem} onPress={() => void selectSuggestion(item)}>
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
          ) : (
            <View style={styles.modalHint}>
              <Text style={styles.modalHintTitle}>
                Tap anywhere on the map to pin {mapTarget === 'pickup' ? 'your pickup point' : 'your destination'}
              </Text>
              <Text style={styles.modalHintText}>
                Search works too, but tapping the map lets you choose the exact spot yourself.
              </Text>
            </View>
          )}

          <View style={styles.mapContainer}>
            <LeafletMap
              userLat={userLat}
              userLon={userLon}
              pickupLat={pickupLat}
              pickupLon={pickupLon}
              destLat={destLat}
              destLon={destLon}
              onMapPress={(coords) => void handleMapPress(coords)}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={labelModalOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setLabelModalOpen(false)}>
          <Pressable style={styles.labelSheet} onPress={() => undefined}>
            <Text style={styles.labelSheetTitle}>{editingCustomPlaceId ? 'Rename saved place' : 'Save another place'}</Text>
            <Text style={styles.labelSheetText}>
              {editingCustomPlaceId
                ? 'Update the label shown when you book a ride.'
                : 'Use a short label so it is easy to spot when booking a ride.'}
            </Text>

            <Text style={styles.labelInputTitle}>Place label</Text>
            <TextInput
              style={styles.labelInput}
              placeholder="Gym, School, Auntie..."
              placeholderTextColor={GRAY}
              value={customPlaceLabel}
              onChangeText={setCustomPlaceLabel}
              autoFocus
              maxLength={24}
            />

            <View style={styles.labelActions}>
              <TouchableOpacity style={styles.labelGhostBtn} onPress={() => setLabelModalOpen(false)}>
                <Text style={styles.labelGhostBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labelPrimaryBtn} onPress={continueCustomPlaceSetup}>
                <Text style={styles.labelPrimaryBtnText}>{editingCustomPlaceId ? 'Save label' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: DARK },
  subGreeting: { fontSize: 13, color: GRAY, marginTop: 2, maxWidth: 270, lineHeight: 19 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  kycAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFD6B0',
  },
  kycAlertText: { flex: 1, color: '#8B4500', fontSize: 12, fontWeight: '600' },

  plannerCard: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  plannerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: ORANGE,
    marginBottom: 4,
  },
  plannerTitle: { fontSize: 18, fontWeight: '800', color: DARK, lineHeight: 24 },
  mapShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ORANGE_LIGHT,
  },
  mapShortcutText: { fontSize: 13, fontWeight: '700', color: ORANGE },

  quickActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F6F6F7',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  quickActionChipSelected: {
    backgroundColor: ORANGE_LIGHT,
    borderColor: '#FFD6B0',
  },
  quickActionChipText: { fontSize: 12, fontWeight: '700', color: DARK },
  quickActionChipTextSelected: { color: ORANGE },

  routeCard: {
    borderRadius: 18,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
    marginBottom: 14,
  },
  routeStopButton: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  originDot: { backgroundColor: '#16A34A' },
  destinationDot: { backgroundColor: ORANGE },
  routeCopy: { flex: 1 },
  routeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: GRAY, marginBottom: 2 },
  routeValue: { fontSize: 14, fontWeight: '700', color: DARK, lineHeight: 20 },
  routePlaceholder: { color: GRAY, fontWeight: '600' },
  routeDivider: { height: 20, width: 1, backgroundColor: '#E5E7EB', marginLeft: 5, marginVertical: 10 },
  routeActionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  routeActionText: { fontSize: 11, fontWeight: '700', color: DARK },
  clearDestinationBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  serviceRow: { gap: 10, marginBottom: 16 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: '#fff',
    padding: 14,
  },
  serviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCopy: { flex: 1 },
  serviceLabel: { fontSize: 15, fontWeight: '800', color: DARK },
  serviceDesc: { fontSize: 12, color: GRAY, marginTop: 2 },
  shareRideCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E8FF',
    padding: 14,
    marginTop: -2,
    marginBottom: 16,
    gap: 14,
  },
  shareRideHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  shareRideIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareRideTitle: { fontSize: 14, fontWeight: '800', color: '#1E3A8A' },
  shareRideText: { fontSize: 12, color: '#476287', marginTop: 4, lineHeight: 18 },
  shareSeatRow: { flexDirection: 'row', gap: 10 },
  shareSeatChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E8FF',
    backgroundColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  shareSeatChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  shareSeatChipValue: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  shareSeatChipValueSelected: { color: '#2563EB' },
  shareSeatChipText: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
  shareSeatChipTextSelected: { color: '#2563EB' },

  primaryAction: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionDisabled: {
    backgroundColor: '#FFB885',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryActionText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  plannerHint: { marginTop: 12, fontSize: 12, color: GRAY, lineHeight: 18 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  savedPlacesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedPlacesAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedPlacesAddText: { color: ORANGE, fontWeight: '700', fontSize: 13 },
  savedPlacesRow: { gap: 12, paddingRight: 20, marginBottom: 22 },
  savedPlaceCard: {
    width: 182,
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  savedPlaceCardEmpty: { borderStyle: 'dashed' },
  savedPlaceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedPlaceLabel: { fontSize: 15, fontWeight: '800', color: DARK },
  savedPlaceAddress: { fontSize: 12, color: GRAY, lineHeight: 18, marginTop: 6, minHeight: 36 },
  savedPlaceMeta: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  customPlaceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  customPlaceSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  customPlaceIcon: { marginBottom: 0, backgroundColor: '#F4F4F5' },
  customPlaceEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addPlaceCard: {
    width: 182,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#FFD6B0',
    justifyContent: 'center',
  },
  addPlaceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPlaceTitle: { fontSize: 15, fontWeight: '800', color: DARK, marginBottom: 6 },
  addPlaceText: { fontSize: 12, color: '#8B4500', lineHeight: 18 },

  recentHeader: { marginBottom: 10 },
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#CCC' },
  emptyTextDark: { fontSize: 14, fontWeight: '700', color: DARK, textAlign: 'center' },
  emptySubText: { fontSize: 12, color: GRAY, textAlign: 'center', lineHeight: 18, maxWidth: 260 },

  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: DARK, marginBottom: 3 },
  modalSubtitle: { fontSize: 12, color: GRAY, lineHeight: 18 },
  pickupModeBar: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pickupModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickupModeBtnSelected: {
    backgroundColor: ORANGE_LIGHT,
    borderColor: '#FFD6B0',
  },
  pickupModeBtnText: { fontSize: 12, fontWeight: '700', color: DARK },
  pickupModeBtnTextSelected: { color: ORANGE },
  modalSearchWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  destInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 12,
    backgroundColor: ORANGE_LIGHT,
  },
  destInputText: { flex: 1, fontSize: 15, color: DARK, fontWeight: '600', paddingVertical: 0 },
  selectionSummaryCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 10,
  },
  selectionSummaryRow: { gap: 4 },
  selectionSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: GRAY,
  },
  selectionSummaryValue: { fontSize: 13, fontWeight: '700', color: DARK },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE7D2',
  },
  savingBannerText: { flex: 1, fontSize: 12, color: '#8B4500', fontWeight: '600', lineHeight: 18 },
  pinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
  },
  pinBannerText: { fontSize: 12, color: '#8B4500', fontWeight: '600' },

  suggestionsBox: { backgroundColor: '#fff', maxHeight: 280, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F7',
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ORANGE_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  suggestionSub: { fontSize: 12, color: GRAY, marginTop: 1 },
  modalHint: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F7',
  },
  modalHintTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 4 },
  modalHintText: { fontSize: 12, color: GRAY, lineHeight: 18 },
  mapContainer: { flex: 1 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  labelSheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
  },
  labelSheetTitle: { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 6 },
  labelSheetText: { fontSize: 13, color: GRAY, lineHeight: 19, marginBottom: 18 },
  labelInputTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: DARK, marginBottom: 8 },
  labelInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: DARK,
    backgroundColor: '#FAFAFA',
  },
  labelActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  labelGhostBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  labelGhostBtnText: { fontSize: 14, fontWeight: '700', color: DARK },
  labelPrimaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: ORANGE,
  },
  labelPrimaryBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  driverStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  driverStatItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverStatValue: { fontSize: 20, fontWeight: '800', color: DARK },
  driverStatLabel: { fontSize: 12, color: GRAY, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshBtn: { marginTop: 16, backgroundColor: ORANGE_LIGHT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  refreshBtnText: { color: ORANGE, fontWeight: '700', fontSize: 13 },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tripStatusPill: {
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tripTime: { fontSize: 11, color: GRAY },
  tripPath: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pathIndicator: { alignItems: 'center', width: 20 },
  pathLine: { width: 2, flex: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },
  pathText: { flex: 1, gap: 12 },
  pathLabel: { fontSize: 14, fontWeight: '600', color: DARK },
  acceptBtn: { backgroundColor: DARK, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pendingTitle: { fontSize: 13, fontWeight: '700', color: '#8B4500', marginBottom: 2 },
  pendingDesc: { fontSize: 11, color: '#92400E', lineHeight: 16 },
  dotOrange: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: ORANGE },
});
