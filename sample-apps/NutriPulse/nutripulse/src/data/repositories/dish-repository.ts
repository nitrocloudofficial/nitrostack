import path from 'path';
import { JsonRepository } from './repository.js';
import { Dish, DishSchema } from '../../domain/types.js';

const CATALOG_PATH = path.resolve(process.cwd(), 'data', 'catalog.json');

export class DishRepository extends JsonRepository<Dish> {
  constructor() {
    // Extract the 'dishes' array from the catalog JSON structure
    super(CATALOG_PATH, DishSchema, (data) => data.dishes || []);
  }

  public getByRestaurant(restaurantId: string): Dish[] {
    return this.getAll().filter(d => d.restaurant_id === restaurantId);
  }
}
