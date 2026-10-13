import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class MaintenanceResources {
  @Resource({
    uri: 'factoryos://maintenance/active-jobs',
    name: 'Active Maintenance Jobs',
    description: 'List of active, assigned, and pending machine maintenance tasks',
    mimeType: 'application/json'
  })
  async getActiveJobs(_ctx: ExecutionContext) {
    return {
      jobs: [
        { jobId: 'JOB-901', machineId: 'CNC-101', status: 'IN_PROGRESS', technician: 'Tech-04', priority: 'HIGH' },
        { jobId: 'JOB-902', machineId: 'PRESS-202', status: 'SCHEDULED', technician: 'Tech-12', priority: 'MEDIUM' }
      ]
    };
  }
}
