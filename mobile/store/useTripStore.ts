import { create } from 'zustand';
import ApiClient from '../api/client';

export type TripStatus =
    | 'requested'
    | 'accepted'
    | 'en_route'
    | 'boarding'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

export interface Trip {
    id: string;
    status: TripStatus;
    pickupLocation: string;
    destinationLocation: string;
    pickupLat: number;
    pickupLon: number;
    destLat: number;
    destLon: number;
    fare?: number;
}

export interface TripSession extends Trip {
    passengerId: string;
    driverId: string | null;
    isShared: boolean;
    seatsRequested: number;
    passengerName: string;
    passengerPhone: string;
    driverName: string;
    driverPhone: string;
    driverRating: number | null;
    vehicleMake: string;
    vehicleModel: string;
    vehiclePlate: string;
    vehicleColor: string;
    estimatedArrivalMins: number | null;
    acceptedBidId: string | null;
    acceptedAt: string | null;
    updatedAt: string;
}

interface TripState {
    currentTrip: TripSession | null;
    availableTrips: Trip[];
    loading: boolean;
    sessionLoading: boolean;
    setCurrentTrip: (trip: TripSession | null) => void;
    setAvailableTrips: (trips: Trip[]) => void;
    updateTripStatus: (status: TripStatus) => void;
    fetchAvailableTrips: (lat?: number, lon?: number, driverId?: string) => Promise<void>;
    fetchTripSession: (tripId: string) => Promise<TripSession | null>;
    syncActiveTrip: (userId: string) => Promise<TripSession | null>;
    clearTrips: () => void;
}

export const useTripStore = create<TripState>((set) => ({
    currentTrip: null,
    availableTrips: [],
    loading: false,
    sessionLoading: false,
    setCurrentTrip: (trip) => set({ currentTrip: trip }),
    setAvailableTrips: (trips) => set({ availableTrips: trips }),
    updateTripStatus: (status) => set((state) => ({
        currentTrip: state.currentTrip ? { ...state.currentTrip, status } : null
    })),
    fetchAvailableTrips: async (lat?: number, lon?: number, driverId?: string) => {
        set({ loading: true });
        try {
            const params = new URLSearchParams();
            if (lat !== undefined && lat !== null) params.append('lat', String(lat));
            if (lon !== undefined && lon !== null) params.append('lon', String(lon));
            if (driverId) params.append('driverId', driverId);

            const res = await ApiClient.get(`/trips/available?${params.toString()}`);
            set({ availableTrips: res.data });
        } catch (error) {
            console.error('[TripStore] Fetch available trips failed:', error);
        } finally {
            set({ loading: false });
        }
    },
    fetchTripSession: async (tripId: string) => {
        if (!tripId) {
            return null;
        }

        set({ sessionLoading: true });
        try {
            const res = await ApiClient.get(`/trips/${tripId}/session`);
            const trip = (res.data?.trip ?? null) as TripSession | null;
            set({ currentTrip: trip });
            return trip;
        } catch (error) {
            console.error('[TripStore] Fetch trip session failed:', error);
            return null;
        } finally {
            set({ sessionLoading: false });
        }
    },
    syncActiveTrip: async (userId: string) => {
        if (!userId) {
            return null;
        }

        set({ sessionLoading: true });
        try {
            const res = await ApiClient.get(`/trips/active-session?userId=${userId}`);
            const trip = (res.data?.trip ?? null) as TripSession | null;
            set({ currentTrip: trip });
            return trip;
        } catch (error) {
            console.error('[TripStore] Sync active trip failed:', error);
            return null;
        } finally {
            set({ sessionLoading: false });
        }
    },
    clearTrips: () => set({ currentTrip: null, availableTrips: [] }),
}));
