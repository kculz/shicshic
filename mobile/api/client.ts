import axios from 'axios';

// For Android emulator, use 10.0.2.2. For iOS simulator, use localhost.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
export const API_ORIGIN = (() => {
    try {
        const parsedUrl = new URL(API_BASE_URL);
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch (error) {
        return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    }
})();

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
