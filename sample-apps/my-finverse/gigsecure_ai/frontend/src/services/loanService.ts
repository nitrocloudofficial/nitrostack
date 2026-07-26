import { api } from './api';

export const loanService = {
  applyLoan: async (payload: { amount: number; tenure_months: number; purpose?: string }) => {
    const response = await api.post('/loan/apply', payload);
    return response.data;
  },
  getActiveLoan: async () => {
    const response = await api.get('/loan/active');
    return response.data;
  },
  getLoanHistory: async () => {
    const response = await api.get('/loan/history');
    return response.data;
  },
  getLoanById: async (loanId: number) => {
    const response = await api.get(`/loan/${loanId}`);
    return response.data;
  }
};
