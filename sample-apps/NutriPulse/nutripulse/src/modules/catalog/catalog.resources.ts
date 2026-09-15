import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { RestaurantRepository } from '../../data/repositories/restaurant-repository.js';
import path from 'path';
import fs from 'fs';

export class catalogResources {

  private repo = new RestaurantRepository();

  @Resource({
    uri: 'catalog://restaurants',
    name: 'Restaurant Catalog',
    description: 'Read this to get the list of all available restaurants. Used to discover where users can order food from.',
    mimeType: 'application/json',
  })
  async getRestaurants(context: ExecutionContext) {
    const restaurants = this.repo.getAll();

    const catalogPath = path.join(process.cwd(), 'data', 'catalog.json');
    const stat = fs.existsSync(catalogPath) ? fs.statSync(catalogPath) : null;

    return {
      contents: [{
        uri: 'catalog://restaurants',
        mimeType: 'application/json',
        text: JSON.stringify(restaurants, null, 2)
      }],
      annotations: { audience: ['any'], priority: 0.5 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }
}

