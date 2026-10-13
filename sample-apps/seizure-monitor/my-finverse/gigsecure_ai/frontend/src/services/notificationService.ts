import { api } from './api';

export const notificationService = {
  getMyNotifications: async () => {
    const response = await api.get('/notifications/my');
    return response.data;
  },
  sendNotification: async (payload: { user_id: number; title: string; message: string; channel?: string }) => {
    const response = await api.post('/notifications/send', payload);
    return response.data;
  }
};
