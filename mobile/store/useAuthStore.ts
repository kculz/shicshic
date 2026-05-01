
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    phoneNumber: string;
    role: 'passenger' | 'driver' | 'admin';
    fullName?: string;
    avatar?: string;
    isVerified?: boolean;
    kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_started';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
}

const storage = createJSONStorage(() => {
    try {
        return AsyncStorage;
    } catch (e) {
        console.warn('AsyncStorage not available, falling back to memory storage');
        return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        } as any;
    }
});

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
            updateUser: (userData) => set((state) => ({
                user: state.user ? { ...state.user, ...userData } : null
            })),
        }),
        {
            name: 'auth-storage',
            storage,
        }
    )
);
