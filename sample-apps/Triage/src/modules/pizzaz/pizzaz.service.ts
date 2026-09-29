import { Injectable } from '@nitrostack/core';
import { PIZZA_SHOPS, type PizzaShop } from './pizzaz.data.js';

@Injectable()
export class PizzazService {
    /**
     * Get all pizza shops
     */
    getAllShops(): PizzaShop[] {
        return PIZZA_SHOPS;
    }

    /**
     * Get a specific pizza shop by ID
     */
    getShopById(id: string): PizzaShop | undefined {
        return PIZZA_SHOPS.find(shop => shop.id === id);
    }

    /**
     * Get pizza shops filtered by criteria
     */
    getShopsFiltered(filters: {
        openNow?: boolean;
        minRating?: number;
        maxPrice?: number;
        cuisine?: string;
    }): PizzaShop[] {
        let shops = [...PIZZA_SHOPS];

        if (filters.openNow) {
            shops = shops.filter(shop => shop.openNow);
        }

        if (filters.minRating !== undefined) {
            shops = shops.filter(shop => shop.rating >= filters.minRating!);
        }

        if (filters.maxPrice !== undefined) {
            shops = shops.filter(shop => shop.priceLevel <= filters.maxPrice!);
        }

        if (filters.cuisine) {
            shops = shops.filter(shop =>
                shop.cuisine.some(c => c.toLowerCase().includes(filters.cuisine!.toLowerCase()))
            );
        }

        return shops;
    }

    /**
     * Get shops sorted by rating
     */
    getTopRatedShops(limit: number = 5): PizzaShop[] {
        return [...PIZZA_SHOPS]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
    }
}
