import { api } from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  sendOTP: async (phone: string) => {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
  },
  verifyOTP: async (phone: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  }
};
