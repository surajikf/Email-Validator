import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // For CORS sessions if needed
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
    response => response,
    error => {
        // Log error or handle global error states here
        console.error('API Error:', error.response?.data?.error || error.message);
        return Promise.reject(error);
    }
);
