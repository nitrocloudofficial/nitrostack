import { api } from './api';

export const creditService = {
  evaluateCreditScore: async (payload: any) => {
    const response = await api.post('/credit-score', payload);
    return response.data;
  }
};
