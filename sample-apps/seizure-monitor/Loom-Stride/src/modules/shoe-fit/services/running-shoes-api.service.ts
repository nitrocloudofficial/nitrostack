import { Injectable } from '@nitrostack/core';
import type { ShoeRecord } from '../types/shoe.types.js';
import { MASTER_CATALOG_ITEMS } from '../data/master-catalog.js';

export interface RunningShoeSpec extends ShoeRecord {
  stack_height_mm: number;
  heel_drop_mm: number;
  weight_g: number;
  foam_type: string;
  support_type: 'Neutral' | 'Stability' | 'Motion Control';
  origin: 'Global' | 'Indian';
}

@Injectable()
export class RunningShoesApiService {
  private runningShoes: RunningShoeSpec[] = MASTER_CATALOG_ITEMS
    .filter((item) => ['Running', 'Sports', 'Basketball', 'Gym', 'Hiking'].includes(item.category))
    .map((item, idx) => {
      const priceUsd = 110 + (idx % 10) * 10;
      const priceInr = Math.round(priceUsd * 83);
      const isStability =
        item.brand === 'Asics' ||
        item.model.includes('Kayano') ||
        item.model.includes('Invincible') ||
        item.model.includes('Structure') ||
        item.model.includes('Adrenaline');

      return {
        id: `running-cat-${item.itemNo.toLowerCase()}`,
        brand: item.brand,
        model: item.model,
        gender: item.gender,
        size_us: 9.5,
        size_uk: 8.5,
        size_eu: 42.5,
        length_mm: Math.round(item.estLengthCm * 10),
        width_mm: Math.round(item.estWidthCm * 10),
        ratio: item.aspectRatio,
        width_category: 'standard' as const,
        category: 'Sports' as const,
        stack_height_mm: 30 + (idx % 12),
        heel_drop_mm: 6 + (idx % 6),
        weight_g: 250 + (idx % 60),
        foam_type:
          item.brand === 'Nike'
            ? 'ZoomX PEBA Foam'
            : item.brand === 'Adidas'
            ? 'Light BOOST'
            : item.brand === 'Asics'
            ? 'FF BLAST PLUS ECO'
            : 'Responsive EVA Cushioning',
        support_type: isStability ? ('Stability' as const) : ('Neutral' as const),
        origin: ['Campus', 'HRX', 'Cult.sport', 'Abros', 'Comet'].includes(item.brand) ? ('Indian' as const) : ('Global' as const),
        heel_counter: isStability ? ('Firm' as const) : ('Medium' as const),
        cushioning: 'High' as const,
        standing_rating: 9,
        price_usd: priceUsd,
        price_inr: priceInr,
        url: item.imageUrl,
        image_url: item.imageUrl,
        source: 'master_catalog_pdf',
        last_updated: new Date().toISOString(),
      };
    });

  getAllRunningShoes(): RunningShoeSpec[] {
    return this.runningShoes;
  }

  getShoesByBrand(brand: string): RunningShoeSpec[] {
    const b = brand.toLowerCase();
    return this.runningShoes.filter((s) => s.brand.toLowerCase().includes(b));
  }

  getShoesBySupportType(supportType: 'Neutral' | 'Stability'): RunningShoeSpec[] {
    return this.runningShoes.filter((s) => s.support_type === supportType);
  }

  searchRunningShoes(query: { brand?: string; support_type?: string; origin?: string }): RunningShoeSpec[] {
    return this.runningShoes.filter((s) => {
      if (query.brand && !s.brand.toLowerCase().includes(query.brand.toLowerCase())) return false;
      if (query.support_type && s.support_type.toLowerCase() !== query.support_type.toLowerCase()) return false;
      if (query.origin && s.origin.toLowerCase() !== query.origin.toLowerCase()) return false;
      return true;
    });
  }
}
