import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fallback handlers for development demo
export const handleApiError = (error: any, fallbackMessage: string) => {
  if (error.response && error.response.data && error.response.data.detail) {
    return error.response.data.detail;
  }
  return fallbackMessage;
};
