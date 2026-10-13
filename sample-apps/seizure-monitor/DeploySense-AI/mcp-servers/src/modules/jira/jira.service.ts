import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class JiraService {
  constructor(private readonly configService: ConfigService) {}

  createIncidentTicket(title: string, description: string, severity: string) {
    // Mock implementation
    const activeScenario = this.configService.getActiveScenarioName();
    const ticketId = activeScenario === 'scenario1' ? 'INC-1025' :
                     activeScenario === 'scenario2' ? 'INC-1026' :
                     activeScenario === 'scenario3' ? 'INC-1027' : 'INC-2048';
    return {
      ticketId,
      title,
      status: 'To Do',
      severity,
      url: `https://jira.example.com/browse/${ticketId}`
    };
  }

  updateIncidentTicket(ticketId: string, status: string, comment: string) {
    // Mock implementation
    return {
      ticketId,
      status,
      updated: true
    };
  }
}

