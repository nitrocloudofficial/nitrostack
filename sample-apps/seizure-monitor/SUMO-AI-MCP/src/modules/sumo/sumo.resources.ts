import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export class SumoResources {
  @Resource({
    uri: 'sumo://stats',
    name: 'SUMO Statistics Report',
    description: 'Raw XML statistics report generated from the latest SUMO simulation run.',
    mimeType: 'application/xml'
  })
  async getSimulationStats(ctx: ExecutionContext) {
    const statsPath = path.join(process.cwd(), 'stats.xml');
    if (!fs.existsSync(statsPath)) {
      return '<error>stats.xml file not found. Run simulation first.</error>';
    }
    return fs.readFileSync(statsPath, 'utf-8');
  }
}
