import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitoringTools } from '../../src/lib/tools/monitoring.tools.js';
import { ProtocolZeroService } from '../../src/modules/protocol-zero.service.js';

describe('MonitoringTools', () => {
  let tools: MonitoringTools;
  let mockService: any;
  let mockCtx: any;

  beforeEach(() => {
    mockService = {
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      getMonitoringStatus: vi.fn().mockReturnValue({ status: 'active', lastRun: 'now' })
    };
    tools = new MonitoringTools(mockService as unknown as ProtocolZeroService);
    
    mockCtx = {
      logger: {
        info: vi.fn()
      }
    };
  });

  it('should start monitoring', async () => {
    const result = await tools.startMonitoring({}, mockCtx);
    expect(mockService.startMonitoring).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(mockCtx.logger.info).toHaveBeenCalledWith(expect.stringContaining("starting"));
  });

  it('should stop monitoring', async () => {
    const result = await tools.stopMonitoring({}, mockCtx);
    expect(mockService.stopMonitoring).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(mockCtx.logger.info).toHaveBeenCalledWith(expect.stringContaining("stopping"));
  });

  it('should get monitoring status', async () => {
    const result = await tools.getMonitoringStatus({}, mockCtx);
    expect(mockService.getMonitoringStatus).toHaveBeenCalled();
    expect(result).toEqual({ status: 'active', lastRun: 'now' });
  });
});
