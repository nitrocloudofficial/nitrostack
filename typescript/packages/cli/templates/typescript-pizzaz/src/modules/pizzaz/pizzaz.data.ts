export interface PizzaShop {
    id: string;
    name: string;
    description: string;
    address: string;
    coords: [number, number]; // [lng, lat]
    rating: number;
    reviews: number;
    priceLevel: 1 | 2 | 3;
    cuisine: string[];
    hours: {
        open: string;
        close: string;
    };
    phone: string;
    website?: string;
    image: string;
    specialties: string[];
    openNow: boolean;
}

export const PIZZA_SHOPS: PizzaShop[] = [
    {
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
        openNow: true,
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
        cuisine: ['Italian', 'Pizza', 'Neapolitan'],
        hours: { open: '12:00 PM', close: '11:00 PM' },
        phone: '(415) 555-0456',
        website: 'https://bellanapoli.example.com',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
        specialties: ['Marinara', 'Quattro Formaggi', 'Diavola'],
        openNow: true,
    },
    {
        id: 'slice-house',
        name: 'The Slice House',
        description: "Casual spot for creative pizza slices and craft beer",
        address: "789 Valencia St, San Francisco, CA 94110",
        coords: [-122.4216, 37.7599],
        rating: 4.3,
        reviews: 289,
        priceLevel: 1,
        cuisine: ['Pizza', 'American', 'Casual'],
        hours: { open: '11:30 AM', close: '9:00 PM' },
        phone: '(415) 555-0789',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
        specialties: ['BBQ Chicken', 'Hawaiian', 'Veggie Supreme'],
        openNow: true,
    },
    {
        id: 'pizzeria-delfina',
        name: 'Pizzeria Delfina',
        description: "Upscale pizzeria with seasonal ingredients and house-made mozzarella",
        address: "3611 18th St, San Francisco, CA 94110",
        coords: [-122.4252, 37.7615],
        rating: 4.6,
        reviews: 678,
        priceLevel: 3,
        cuisine: ['Italian', 'Pizza', 'Fine Dining'],
        hours: { open: '5:00 PM', close: '10:00 PM' },
        phone: '(415) 555-3611',
        website: 'https://pizzeriadelfina.example.com',
        image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f',
        specialties: ['Salsiccia', 'Funghi', 'Prosciutto e Rucola'],
        openNow: false,
    },
    {
        id: 'golden-boy',
        name: 'Golden Boy Pizza',
        description: "North Beach institution serving thick Sicilian-style squares",
        address: "542 Green St, San Francisco, CA 94133",
        coords: [-122.4102, 37.7999],
        rating: 4.4,
        reviews: 445,
        priceLevel: 1,
        cuisine: ['Pizza', 'Sicilian', 'Italian'],
        hours: { open: '11:30 AM', close: '11:30 PM' },
        phone: '(415) 555-0542',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
        specialties: ['Clam & Garlic', 'Pesto', 'Classic Cheese'],
        openNow: true,
    },
];
