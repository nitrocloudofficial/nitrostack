import {
  ResourceDecorator as Resource,
  ControllerDecorator as Controller,
  ExecutionContext,
} from '@nitrostack/core';
import { ShoeDatabaseService } from './services/shoe-database.service.js';
import { FootMeasurementService } from './services/foot-measurement.service.js';
import { COIN_SPECS } from './types/shoe.types.js';

@Controller()
export class ShoeFitResources {
  constructor(
    private readonly shoeDb: ShoeDatabaseService,
    private readonly footMeasurement: FootMeasurementService
  ) {}

  @Resource({
    uri: 'shoefit://brands',
    name: 'Shoe Brands Catalog',
    description: 'All brands in the ShoeFit database with record counts',
    mimeType: 'application/json',
  })
  async getBrands(_uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource: shoefit://brands');
    const db = this.shoeDb.getDatabase();
    const brandCounts = db.shoes.reduce<Record<string, number>>((acc, shoe) => {
      acc[shoe.brand] = (acc[shoe.brand] ?? 0) + 1;
      return acc;
    }, {});

    return {
      contents: [
        {
          uri: 'shoefit://brands',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              brands: this.shoeDb.getBrands().map((brand) => ({
                brand,
                sku_count: brandCounts[brand] ?? 0,
              })),
              meta: db.meta,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  @Resource({
    uri: 'shoefit://photo-guide',
    name: 'Foot Photo Guide',
    description: 'Instructions for taking accurate coin-calibrated foot photos',
    mimeType: 'application/json',
  })
  async getPhotoGuide(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource: shoefit://photo-guide');

    const guide = {
      steps: [
        'Place a bare foot flat on a light-colored floor (white or light gray works best).',
        'Put a standard coin flat beside the foot — not on top of it. US Quarter recommended.',
        'Hold the phone directly above (90°), keeping the coin and full foot in frame.',
        'Ensure even lighting; avoid shadows across the foot or coin.',
        'Upload one combined photo, or separate coin + foot photos at the same camera height.',
      ],
      supported_coins: COIN_SPECS,
      tips: [
        'Toe-to-heel length should align with the longest axis of the foot blob.',
        'Width is measured at the ball of the foot (widest part, ~55% from heel).',
        'Ratio = length ÷ width — used to match shoe last shape.',
      ],
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(guide, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'shoefit://database/stats',
    name: 'Database Statistics',
    description: 'Shoe database metadata and last scrape timestamp',
    mimeType: 'application/json',
  })
  async getDatabaseStats(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource: shoefit://database/stats');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(this.shoeDb.getStats(), null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'shoefit://calibration-objects',
    name: 'Calibration Reference Objects',
    description: 'Detailed specs (diameters and types) of all coins and cards supported for image calibration',
    mimeType: 'application/json',
  })
  async getCalibrationSpecs(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource: shoefit://calibration-objects');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(COIN_SPECS, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'shoefit://measurement/latest',
    name: 'Latest Foot Measurement',
    description: 'Retrieves the most recent successful foot measurement, including dimensions and confidence score',
    mimeType: 'application/json',
  })
  async getLatestMeasurement(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource: shoefit://measurement/latest');
    const latest = this.footMeasurement.getLatest();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            latest ?? { status: 'no_measurements_recorded_yet' },
            null,
            2
          ),
        },
      ],
    };
  }
}
