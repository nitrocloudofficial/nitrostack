import { ResourceDecorator as Resource, Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { ReportingService } from './reporting.service.js';

@Injectable({ deps: [ProjectStateService, ReportingService] })
export class ReportingResources {
  constructor(
    private readonly state: ProjectStateService,
    private readonly reportingService: ReportingService
  ) {}

  @Resource({
    uri: 'report://{id}/planning',
    name: 'Planning Report',
    description: 'The assembled Project Planning Report for a session',
    mimeType: 'application/json',
  })
  async getPlanningReport(uri: string, ctx: ExecutionContext) {
    const id = uri.match(/^report:\/\/([^/]+)\/planning$/)?.[1];
    if (!id || !this.state.has(id)) {
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ error: 'not_found' }) }] };
    }
    const report = await this.reportingService.assemblePlanningReport(id, ctx);
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }] };
  }

  @Resource({
    uri: 'report://{id}/allocation',
    name: 'Allocation & Progress Report',
    description: 'The assembled Team Allocation & Progress Report for a session',
    mimeType: 'application/json',
  })
  async getAllocationReport(uri: string, ctx: ExecutionContext) {
    const id = uri.match(/^report:\/\/([^/]+)\/allocation$/)?.[1];
    if (!id || !this.state.has(id)) {
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ error: 'not_found' }) }] };
    }
    const report = await this.reportingService.assembleAllocationReport(id, ctx);
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }] };
  }
}
