import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class LogsService {
  constructor(private readonly configService: ConfigService) {}

  private getData() {
    return this.configService.getMockData('logs');
  }

  private getLogsList(): any[] {
    const data = this.getData();
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.logs)) return data.logs;
    return [];
  }

  searchLogs(query: string) {
    const logs = this.getLogsList();
    return logs.filter((log: any) => log.message.includes(query) || log.service.includes(query));
  }

  latestErrors() {
    const logs = this.getLogsList();
    return logs.filter((log: any) => log.level === 'ERROR' || log.level === 'FATAL');
  }

  getServiceLogs(serviceName: string) {
    const logs = this.getLogsList();
    return logs.filter((log: any) => log.service === serviceName);
  }
}


