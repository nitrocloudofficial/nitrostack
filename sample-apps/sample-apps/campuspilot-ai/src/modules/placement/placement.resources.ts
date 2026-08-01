import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

export class PlacementResources {
  @Resource({
    uri: 'campuspilot://placement',
    name: 'Placement Roadmap',
    description: 'Complete placement preparation guide including DSA roadmap, system design topics, company-wise interview rounds, and recommended resources for FAANG, service, and product companies.',
    mimeType: 'application/json',
  })
  async getPlacementData(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving placement resource');

    const filePath = path.join(RESOURCES_PATH, 'placement.json');
    const raw = fs.readFileSync(filePath, 'utf-8');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: raw,
        },
      ],
    };
  }
}
