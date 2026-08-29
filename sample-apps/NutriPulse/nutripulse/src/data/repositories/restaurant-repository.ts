import path from 'path';
import { JsonRepository } from './repository.js';
import { Restaurant, RestaurantSchema } from '../../domain/types.js';

const CATALOG_PATH = path.resolve(process.cwd(), 'data', 'catalog.json');

export class RestaurantRepository extends JsonRepository<Restaurant> {
  constructor() {
    // Extract the 'restaurants' array from the catalog JSON structure
    super(CATALOG_PATH, RestaurantSchema, (data) => data.restaurants || []);
  }
}
