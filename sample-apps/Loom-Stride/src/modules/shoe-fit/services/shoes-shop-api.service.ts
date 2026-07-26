import { Injectable } from '@nitrostack/core';
import type { ShoeRecord } from '../types/shoe.types.js';

export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  inStock: boolean;
  imageUrl: string;
  rating: number;
}

@Injectable()
export class ShoesShopApiService {
  private shopCatalog: ShopProduct[] = [
    {
      id: 'shop-asics-kayano-30',
      name: 'Gel-Kayano 30 Stability Runner',
      brand: 'Asics',
      category: 'Sports',
      price: 14999,
      currency: 'INR',
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80',
      rating: 4.9,
    },
    {
      id: 'shop-nike-pegasus-40',
      name: 'Air Zoom Pegasus 40 Road Runner',
      brand: 'Nike',
      category: 'Sports',
      price: 11895,
      currency: 'INR',
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
      rating: 4.8,
    },
    {
      id: 'shop-hoka-clifton-9',
      name: 'Clifton 9 Max Cushioning',
      brand: 'Hoka',
      category: 'Sports',
      price: 13999,
      currency: 'INR',
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
      rating: 4.9,
    },
    {
      id: 'shop-adidas-ultraboost',
      name: 'Ultraboost Light Performance',
      brand: 'Adidas',
      category: 'Sports',
      price: 18999,
      currency: 'INR',
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80',
      rating: 4.7,
    },
    {
      id: 'shop-hrx-run-pro',
      name: 'HRX Performance Run Pro',
      brand: 'HRX',
      category: 'Sports',
      price: 2499,
      currency: 'INR',
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
      rating: 4.5,
    },
  ];

  getCatalog(): ShopProduct[] {
    return this.shopCatalog;
  }

  getProductById(id: string): ShopProduct | undefined {
    return this.shopCatalog.find((p) => p.id === id);
  }

  getProductsByBrand(brand: string): ShopProduct[] {
    const b = brand.toLowerCase();
    return this.shopCatalog.filter((p) => p.brand.toLowerCase().includes(b));
  }
}
