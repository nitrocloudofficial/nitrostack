import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { PizzazService } from './pizzaz.service.js';

const ShowMapSchema = z.object({
    filter: z.enum(['open_now', 'top_rated', 'all']).optional().describe('Filter to apply'),
});

const ShowListSchema = z.object({
    openNow: z.boolean().optional().describe('Show only shops that are currently open'),
    minRating: z.number().min(1).max(5).optional().describe('Minimum rating (1-5)'),
    maxPrice: z.number().min(1).max(3).optional().describe('Maximum price level (1-3)'),
});

const ShowShopSchema = z.object({
    shopId: z.string().describe('ID of the pizza shop to display'),
});

// Note: Using explicit deps for ESM compatibility
@Injectable({ deps: [PizzazService] })
export class PizzazTools {
    constructor(private readonly pizzazService: PizzazService) { }

    @Tool({
        name: 'show_pizza_map',
        description: 'Display an interactive map of pizza shops in San Francisco',
        inputSchema: ShowMapSchema,
        examples: {
            request: { filter: 'all' },
            response: {
                shops: [
                    {
                        id: 'tonys-pizza',
                        name: "Tony's New York Pizza",
                        description: "Authentic New York-style pizza with a crispy thin crust",
                        address: "123 Main St, San Francisco, CA 94102",
                        coords: [-122.4194, 37.7749],
                        rating: 4.5,
                        reviews: 342,
                        priceLevel: 2,
                        cuisine: ['Italian', 'Pizza'],
                        hours: { open: '11:00 AM', close: '10:00 PM' },
                        phone: '(415) 555-0123',
                        website: 'https://tonyspizza.example.com',
                        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
                        specialties: ['Margherita', 'Pepperoni'],
                        openNow: true
                    },
                    {
                        id: 'bella-napoli',
                        name: 'Bella Napoli',
                        description: "Traditional Neapolitan pizza baked in a wood-fired oven",
                        address: "456 Market St, San Francisco, CA 94103",
                        coords: [-122.4089, 37.7858],
                        rating: 4.8,
                        reviews: 521,
                        priceLevel: 3,
                        cuisine: ['Italian', 'Pizza'],
                        hours: { open: '12:00 PM', close: '11:00 PM' },
                        phone: '(415) 555-0456',
                        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
                        specialties: ['Marinara', 'Quattro Formaggi'],
                        openNow: true
                    }
                ],
                filter: 'all',
                totalShops: 2
            }
        }
    })
    @Widget('pizza-map')
    async showPizzaMap(args: z.infer<typeof ShowMapSchema>, ctx: ExecutionContext) {
        let shops;

        switch (args.filter) {
            case 'open_now':
                shops = this.pizzazService.getShopsFiltered({ openNow: true });
                break;
            case 'top_rated':
                shops = this.pizzazService.getTopRatedShops();
                break;
            default:
                shops = this.pizzazService.getAllShops();
        }

        ctx.logger.info('Showing pizza map', { filter: args.filter, totalShops: shops.length });

        return {
            shops,
            filter: args.filter || 'all',
            totalShops: shops.length,
        };
    }

    @Tool({
        name: 'show_pizza_list',
        description: 'Display a list of pizza shops with filtering and sorting options',
        inputSchema: ShowListSchema,
        examples: {
            request: { openNow: true },
            response: {
                shops: [
                    {
                        id: 'tonys-pizza',
                        name: "Tony's New York Pizza",
                        description: "Authentic New York-style pizza with a crispy thin crust",
                        address: "123 Main St, San Francisco, CA 94102",
                        coords: [-122.4194, 37.7749],
                        rating: 4.5,
                        reviews: 342,
                        priceLevel: 2,
                        cuisine: ['Italian', 'Pizza'],
                        hours: { open: '11:00 AM', close: '10:00 PM' },
                        phone: '(415) 555-0123',
                        website: 'https://tonyspizza.example.com',
                        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
                        specialties: ['Margherita', 'Pepperoni'],
                        openNow: true
                    }
                ],
                filters: { openNow: true },
                totalShops: 1
            }
        }
    })
    @Widget('pizza-list')
    async showPizzaList(args: z.infer<typeof ShowListSchema>, ctx: ExecutionContext) {
        const shops = this.pizzazService.getShopsFiltered(args);

        ctx.logger.info('Showing pizza list', { filters: args, totalShops: shops.length });

        return {
            shops,
            filters: args,
            totalShops: shops.length,
        };
    }

    @Tool({
        name: 'show_pizza_shop',
        description: 'Display detailed information about a specific pizza shop',
        inputSchema: ShowShopSchema,
        examples: {
            request: { shopId: 'tonys-pizza' },
            response: {
                shop: {
                    id: 'tonys-pizza',
                    name: "Tony's New York Pizza",
                    description: "Authentic New York-style pizza with a crispy thin crust and fresh toppings",
                    address: "123 Main St, San Francisco, CA 94102",
                    coords: [-122.4194, 37.7749],
                    rating: 4.5,
                    reviews: 342,
                    priceLevel: 2,
                    cuisine: ['Italian', 'Pizza', 'New York Style'],
                    hours: { open: '11:00 AM', close: '10:00 PM' },
                    phone: '(415) 555-0123',
                    website: 'https://tonyspizza.example.com',
                    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
                    specialties: ['Margherita', 'Pepperoni', 'White Pizza'],
                    openNow: true
                },
                relatedShops: [
                    {
                        id: 'bella-napoli',
                        name: 'Bella Napoli',
                        description: "Traditional Neapolitan pizza baked in a wood-fired oven",
                        address: "456 Market St, San Francisco, CA 94103",
                        coords: [-122.4089, 37.7858],
                        rating: 4.8,
                        reviews: 521,
                        priceLevel: 3,
                        cuisine: ['Italian', 'Pizza'],
                        hours: { open: '12:00 PM', close: '11:00 PM' },
                        phone: '(415) 555-0456',
                        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
                        specialties: ['Marinara', 'Quattro Formaggi'],
                        openNow: true
                    }
                ]
            }
        }
    })
    @Widget('pizza-shop')
    async showPizzaShop(args: z.infer<typeof ShowShopSchema>, ctx: ExecutionContext) {
        const shop = this.pizzazService.getShopById(args.shopId);

        if (!shop) {
            throw new Error(`Pizza shop not found: ${args.shopId}`);
        }

        ctx.logger.info('Showing pizza shop', { shopId: args.shopId, shopName: shop.name });

        return {
            shop,
            relatedShops: this.pizzazService.getTopRatedShops(3).filter(s => s.id !== shop.id),
        };
    }
}
