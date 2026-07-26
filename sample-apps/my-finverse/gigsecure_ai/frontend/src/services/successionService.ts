import { api } from './api';

export const successionService = {
  registerNominee: async (payload: any) => {
    const res = await api.post('/nominee/register', payload);
    return res.data;
  },

  getNomineeDetails: async () => {
    const res = await api.get('/nominee/details');
    return res.data;
  },

  executeRescue: async (nomineeId: number, workerAadhaar: string) => {
    const res = await api.post(`/succession/rescue/${nomineeId}?worker_aadhaar=${workerAadhaar}`);
    return res.data;
  },

  rescueClaim: async (aadhaar: string, deathCertNo: string) => {
    const res = await api.post(`/succession/rescue/1?worker_aadhaar=${aadhaar}`);
    return res.data;
  }
};
