import { api } from './api';

export const repaymentService = {
  processRepayment: async (payload: { loan_id: number; income: number }) => {
    const res = await api.post('/repayment/process', payload);
    return res.data;
  },

  processDailyRepayment: async (loanId: number, income: number) => {
    const res = await api.post('/repayment/process', { loan_id: loanId, income });
    return res.data;
  },

  pauseLoan: async (loanId: number) => {
    const res = await api.post(`/repayment/pause/${loanId}`);
    return res.data;
  },

  resumeLoan: async (loanId: number) => {
    const res = await api.post(`/repayment/resume/${loanId}`);
    return res.data;
  },

  getHistory: async () => {
    const res = await api.get('/repayment/history');
    return res.data;
  }
};
