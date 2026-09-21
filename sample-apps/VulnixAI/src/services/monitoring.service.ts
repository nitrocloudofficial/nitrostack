import { ApiClient } from '@/utils/api';

export interface MonitoredSite {
  _id: string;
  userId: string;
  url: string;
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  uptime: number;
  sslValid: boolean;
  sslExpiry: string | null;
  lastChecked: string;
  responseHistory: number[];
  statusHistory: ('up' | 'down' | 'degraded')[];
  checkInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddSiteRequest {
  url: string;
  name?: string;
  checkInterval?: number;
}

export const monitoringService = {
  async getSites(): Promise<MonitoredSite[]> {
    return ApiClient.get('/api/monitoring');
  },

  async addSite(data: AddSiteRequest): Promise<MonitoredSite> {
    return ApiClient.post('/api/monitoring', data);
  },

  async refreshSite(siteId: string): Promise<MonitoredSite> {
    return ApiClient.post(`/api/monitoring/${siteId}/refresh`);
  },

  async refreshAllSites(): Promise<MonitoredSite[]> {
    return ApiClient.post('/api/monitoring/refresh');
  },

  async removeSite(siteId: string): Promise<void> {
    return ApiClient.delete(`/api/monitoring/${siteId}`);
  },

  async updateCheckInterval(siteId: string, checkInterval: number): Promise<MonitoredSite> {
    return ApiClient.patch(`/api/monitoring/${siteId}/interval`, { checkInterval });
  },
};
