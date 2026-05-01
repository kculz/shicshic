
import { create } from 'zustand';
import ApiClient from '../api/client';

interface Trip {
    id: string;
    status: 'requested' | 'accepted' | 'en_route' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
    pickupLocation: string;
    destinationLocation: string;
    pickupLat: number;
    pickupLon: number;
    destLat: number;
    destLon: number;
    fare?: number;
}

interface TripState {
    currentTrip: Trip | null;
    availableTrips: Trip[];
    loading: boolean;
    setCurrentTrip: (trip: Trip | null) => void;
    setAvailableTrips: (trips: Trip[]) => void;
    updateTripStatus: (status: Trip['status']) => void;
    fetchAvailableTrips: () => Promise<void>;
    clearTrips: () => void;
}

export const useTripStore = create<TripState>((set) => ({
    currentTrip: null,
    availableTrips: [],
    loading: false,
    setCurrentTrip: (trip) => set({ currentTrip: trip }),
    setAvailableTrips: (trips) => set({ availableTrips: trips }),
    updateTripStatus: (status) => set((state) => ({
        currentTrip: state.currentTrip ? { ...state.currentTrip, status } : null
    })),
    fetchAvailableTrips: async (lat?: number, lon?: number, driverId?: string) => {
        set({ loading: true });
        try {
            const params = new URLSearchParams();
            if (lat) params.append('lat', String(lat));
            if (lon) params.append('lon', String(lon));
            if (driverId) params.append('driverId', driverId);

            const res = await ApiClient.get(`/trips/available?${params.toString()}`);
            set({ availableTrips: res.data });
        } catch (error) {
            console.error('[TripStore] Fetch failed:', error);
        } finally {
            set({ loading: false });
        }
    },
    clearTrips: () => set({ currentTrip: null, availableTrips: [] }),
}));
