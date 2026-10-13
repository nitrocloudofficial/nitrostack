import { AgentHealthMonitorService } from '../services/AgentHealthMonitor.service.js';

export const healthResource = {
  uri: 'resource://agent/health',
  name: 'Agent Health Telemetry',
  description: 'Real-time agent health indicators, processed count, success rate, and avg latency',
  read: async () => {
    const monitor = AgentHealthMonitorService.getInstance();
    return monitor.getMetrics();
  }
};
