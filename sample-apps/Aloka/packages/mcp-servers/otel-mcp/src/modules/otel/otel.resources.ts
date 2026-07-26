import { ResourceDecorator as Resource } from '@nitrostack/core';
import { OTelService } from './otel.service.js';

export class OTelResources {
  constructor(private readonly otelService: OTelService) {}

  @Resource({
    name: 'trace_waterfall',
    uri: 'otel://traces/{trace_id}/waterfall',
    description: 'Structural JSON representation of the entire microservice call hierarchy'
  })
  async getTraceWaterfall(uri: string, params: { trace_id: string }) {
    return { contents: [{ uri, text: await this.otelService.fetchTraceWaterfall(params.trace_id) }] };
  }
}
