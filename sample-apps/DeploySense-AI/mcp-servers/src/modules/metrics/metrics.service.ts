import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class MetricsService {
  constructor(private readonly configService: ConfigService) {}

  private getData() {
    return this.configService.getMockData('metrics');
  }

  getCpuUsage() {
    return this.getData().cpu;
  }

  getMemoryUsage() {
    return this.getData().memory;
  }

  getErrorRate() {
    return this.getData().errorRate;
  }

  getResponseTime() {
    return this.getData().responseTime;
  }
}

