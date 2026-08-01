import { ToolDecorator as Tool, ControllerDecorator as Controller, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { RoutingService } from '../services/routing.service.js';

const calculateRouteSchema = z.object({
  origin_latitude: z.number().min(-90).max(90).describe('Latitude of the ambulance/patient origin'),
  origin_longitude: z.number().min(-180).max(180).describe('Longitude of the ambulance/patient origin'),
  destination_latitude: z.number().min(-90).max(90).describe('Latitude of the destination hospital'),
  destination_longitude: z.number().min(-180).max(180).describe('Longitude of the destination hospital'),
});
type CalculateRouteInput = z.infer<typeof calculateRouteSchema>;

// See HospitalTools for why @Injectable({ deps }) must be stacked on @Controller.
@Controller()
@Injectable({ deps: [RoutingService] })
export class RoutingTools {
  constructor(private readonly routingService: RoutingService) {}

  @Tool({
    name: 'calculate_route',
    description:
      'Calculate ambulance travel distance, ETA, and route geometry (GeoJSON) between an origin and a hospital destination via OpenRouteService, falling back to a haversine-distance estimate if the routing API is unavailable.',
    inputSchema: calculateRouteSchema,
  })
  async calculateRoute(input: CalculateRouteInput, ctx: ExecutionContext) {
    ctx.logger.info('Calculating route', input);
    return this.routingService.calculateRoute(input, ctx.logger);
  }
}
