import * as path from 'path';
import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DATA_DIR, readJsonFile, writeJsonFile } from '../../../common/file.utils.js';
import type {
  Gender,
  MatchResult,
  ShoeDatabase,
  ShoeMatch,
  ShoeRecord,
  WidthCategory,
} from '../types/shoe.types.js';

import { buildMasterCatalogDataset } from '../data/master-catalog.js';

const DB_PATH = path.join(DATA_DIR, 'shoes.json');
const TOE_ROOM_MM = 10;

@Injectable()
export class ShoeDatabaseService implements OnModuleInit {
  private database: ShoeDatabase = this.emptyDatabase();

  async onModuleInit(): Promise<void> {
    const masterShoes = buildMasterCatalogDataset();
    this.database = this.normaliseDatabase(masterShoes, ['master_catalog_pdf']);
    this.persist();
    console.log(`[Database Service] Loaded ${this.database.shoes.length} official master catalog shoe records (270 models).`);
  }

  private emptyDatabase(): ShoeDatabase {
    return {
      meta: { version: '5.0.0', last_scraped: new Date().toISOString(), total_records: 0, brands: [], sources: ['master_catalog_pdf'] },
      shoes: [],
    };
  }

  private normaliseDatabase(shoes: ShoeRecord[], sources: string[]): ShoeDatabase {
    return {
      meta: {
        version: '5.0.0',
        last_scraped: new Date().toISOString(),
        total_records: shoes.length,
        brands: [...new Set(shoes.map((shoe) => shoe.brand))].sort(),
        sources: [...new Set(sources)],
      },
      shoes: shoes.sort((a, b) => a.size_us - b.size_us || a.length_mm - b.length_mm),
    };
  }

  persist(): void {
    writeJsonFile(DB_PATH, this.database);
  }

  getDatabase(): ShoeDatabase {
    return this.database;
  }

  getBrands(): string[] {
    return [...this.database.meta.brands].sort();
  }

  getStats() {
    return {
      ...this.database.meta,
      total_records: this.database.shoes.length,
    };
  }

  upsertShoes(shoes: ShoeRecord[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    const byId = new Map(this.database.shoes.map((s) => [s.id, s]));

    for (const shoe of shoes) {
      if (byId.has(shoe.id)) {
        byId.set(shoe.id, shoe);
        updated++;
      } else {
        byId.set(shoe.id, shoe);
        added++;
      }
    }

    this.database.shoes = Array.from(byId.values());
    this.database.meta.total_records = this.database.shoes.length;
    this.database.meta.brands = [...new Set(this.database.shoes.map((s) => s.brand))].sort();
    this.database.meta.last_scraped = new Date().toISOString();
    this.persist();
    return { added, updated };
  }

  replaceFromScrape(shoes: ShoeRecord[], sources: string[]): void {
    // A refresh is authoritative: removed web listings must not linger as recommendations.
    this.database = this.normaliseDatabase(shoes, sources);
    this.persist();
  }

  findMatches(input: {
    length_mm: number;
    width_mm: number;
    ratio: number;
    gender?: Gender;
    brand_filter?: string;
    limit?: number;
  }): MatchResult {
    const limit = input.limit ?? 8;
    let candidates = this.database.shoes;

    if (input.gender) {
      candidates = candidates.filter(
        (s) => s.gender === input.gender || s.gender === 'unisex'
      );
    }

    if (input.brand_filter) {
      const brand = input.brand_filter.toLowerCase();
      candidates = candidates.filter((s) => s.brand.toLowerCase().includes(brand));
    }

    const targetLength = input.length_mm + TOE_ROOM_MM;

    const scored: ShoeMatch[] = candidates.map((shoe) => {
      const ratioDelta = Math.abs(shoe.ratio - input.ratio);
      const lengthDelta = Math.abs(shoe.length_mm - targetLength);
      const widthDelta = Math.abs(shoe.width_mm - input.width_mm);

      const fitScore =
        ratioDelta * 20 +
        lengthDelta * 0.25 +
        widthDelta * 0.8;

      const fitSummary = this.buildFitSummary(ratioDelta, lengthDelta, widthDelta);

      return {
        shoe,
        fit_score: Math.round(fitScore * 100) / 100,
        ratio_delta: Math.round(ratioDelta * 1000) / 1000,
        length_delta_mm: Math.round(lengthDelta * 10) / 10,
        width_delta_mm: Math.round(widthDelta * 10) / 10,
        recommended_toe_room_mm: TOE_ROOM_MM,
        fit_summary: fitSummary,
      };
    });

    scored.sort((a, b) => a.fit_score - b.fit_score);

    return {
      foot: {
        length_mm: input.length_mm,
        width_mm: input.width_mm,
        ratio: input.ratio,
      },
      matches: scored.slice(0, limit),
      total_candidates: candidates.length,
      query: {
        gender: input.gender,
        brand_filter: input.brand_filter,
        limit,
      },
    };
  }

  private buildFitSummary(
    ratioDelta: number,
    lengthDelta: number,
    widthDelta: number
  ): string {
    if (ratioDelta < 0.05 && lengthDelta < 5 && widthDelta < 4) {
      return 'Excellent match — length, width, and foot shape ratio align well.';
    }
    if (ratioDelta < 0.1 && lengthDelta < 10) {
      return 'Strong match — ratio and size are close; verify width feel when trying on.';
    }
    if (ratioDelta < 0.15) {
      return 'Good ratio match — size may need half-size adjustment for length or width.';
    }
    return 'Approximate match — consider adjacent sizes or width variants.';
  }

  inferWidthCategory(widthMm: number, gender: Gender = 'men'): WidthCategory {
    const thresholds =
      gender === 'women'
        ? { narrow: 82, standard: 90, wide: 98 }
        : { narrow: 92, standard: 100, wide: 108 };

    if (widthMm < thresholds.narrow) return 'narrow';
    if (widthMm < thresholds.standard) return 'standard';
    if (widthMm < thresholds.wide) return 'wide';
    return 'extra_wide';
  }
}
