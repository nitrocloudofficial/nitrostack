import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ProductionResources {
  @Resource({
    uri: 'factoryos://production/line-status',
    name: 'Assembly Line Status',
    description: 'Real-time operating status and output metrics of factory production lines',
    mimeType: 'application/json'
  })
  async getLineStatus(_ctx: ExecutionContext) {
    return {
      lines: [
        { id: 'Line-A', status: 'RUNNING', efficiency: '94%', activeJob: 'JOB-8821' },
        { id: 'Line-B', status: 'STANDBY', efficiency: '98%', activeJob: 'NONE' },
        { id: 'Line-C', status: 'MAINTENANCE', efficiency: '0%', activeJob: 'NONE' }
      ]
    };
  }
}
