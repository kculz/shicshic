import axios from 'axios';
import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2. For iOS simulator, use localhost.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
