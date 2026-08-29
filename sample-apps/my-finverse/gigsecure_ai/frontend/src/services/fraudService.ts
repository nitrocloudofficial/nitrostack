import { api } from './api';

export const fraudService = {
  uploadInvoice: async (payload: {
    gstin: string;
    merchant_name?: string;
    platform_id: string;
    invoice_number: string;
    invoice_date?: string;
    date?: string;
    amount: number;
    buyer_name?: string;
    buyer_gstin?: string;
    eway_bill_number?: string;
    vehicle_number?: string;
    transport_id?: string;
    submitting_bank?: string;
  }) => {
    const res = await api.post('/invoice/upload', payload);
    return res.data;
  },

  checkFraud: async (payload: {
    gstin: string;
    platform_id: string;
    invoice_number: string;
    invoice_date: string;
    amount: number;
    buyer_gstin?: string;
    bank_name?: string;
  }) => {
    const res = await api.post('/fraud/check', payload);
    return res.data;
  },

  getHistory: async (limit: number = 20) => {
    const res = await api.get(`/fraud/history?limit=${limit}`);
    return res.data;
  },

  getStatistics: async () => {
    const res = await api.get('/fraud/statistics');
    return res.data;
  },

  getFraudLedger: async () => {
    const res = await api.get('/fraud/history');
    return res.data;
  }
};
