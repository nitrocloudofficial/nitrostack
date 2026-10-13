import { AgentHealthMonitorService } from '../services/AgentHealthMonitor.service.js';

export async function fetchAgentHealthMetrics() {
  const monitor = AgentHealthMonitorService.getInstance();
  return monitor.getMetrics();
}
