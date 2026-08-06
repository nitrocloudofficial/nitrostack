import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Widget,
  InitialTool,
  Cache,
  RateLimit,
  ExecutionContext,
  emitEvent,
  z,
} from '@nitrostack/core';
import { decodeBase64File, saveUpload } from '../../common/file.utils.js';
import { FootMeasurementService } from './services/foot-measurement.service.js';
import { ShoeDatabaseService } from './services/shoe-database.service.js';
import { ShoeScraperService } from './services/shoe-scraper.service.js';
import { ImageScraperService } from './services/image-scraper.service.js';
import { COIN_SPECS, type CoinType, type CoinSpec, type Gender } from './types/shoe.types.js';
import { FitWiseEngineService, calculateAccurateShoeSize } from './services/fitwise-engine.service.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SneaksAPI = require('sneaks-api');

const sneaksClient = new SneaksAPI();

const fileUploadFields = {
  file_name: z.string().describe('Original file name'),
  file_type: z.string().describe('MIME type'),
  file_content: z.string().describe('Base64 encoded file content'),
};

const coinTypeSchema = z
  .enum([
    'inr_5',
    'inr_10',
    'credit_card',
  ])
  .describe('Coin or Debit/Credit Card placed beside the foot for scale calibration');

import { RunningShoesApiService } from './services/running-shoes-api.service.js';
import { DecathlonSportsApiService } from './services/decathlon-sports-api.service.js';
import { LlmOrchestratorService } from './services/llm-orchestrator.service.js';
import { VisionQaAgentService } from './services/vision-qa-agent.service.js';
import { PodiatristAgentService } from './services/podiatrist-agent.service.js';
import { RagCatalogAgentService } from './services/rag-catalog-agent.service.js';
import { PersonalShopperAgentService } from './services/personal-shopper-agent.service.js';
import { ImageCompressionAgentService } from './services/image-compression-agent.service.js';

@Controller()
export class ShoeFitTools {
  constructor(
    private readonly footMeasurement: FootMeasurementService,
    private readonly shoeDb: ShoeDatabaseService,
    private readonly scraper: ShoeScraperService,
    private readonly imageScraper: ImageScraperService,
    private readonly fitWiseEngine: FitWiseEngineService,
    private readonly runningShoesApi: RunningShoesApiService,
    private readonly decathlonSportsApi: DecathlonSportsApiService,
    private readonly llmOrchestrator: LlmOrchestratorService,
    private readonly visionQa: VisionQaAgentService,
    private readonly podiatristAgent: PodiatristAgentService,
    private readonly ragCatalogAgent: RagCatalogAgentService,
    private readonly personalShopperAgent: PersonalShopperAgentService,
    private readonly imageCompressor: ImageCompressionAgentService
  ) {}

  private fetchSneaksLive(keyword: string, limit = 10): Promise<any[]> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve([]), 6000);
      try {
        sneaksClient.getProducts(keyword, limit, (err: any, products: any[]) => {
          clearTimeout(timeout);
          if (err || !products || !Array.isArray(products)) {
            resolve([]);
          } else {
            resolve(products);
          }
        });
      } catch {
        clearTimeout(timeout);
        resolve([]);
      }
    });
  }

  private fetchSneaksPopular(limit = 12): Promise<any[]> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve([]), 6000);
      try {
        sneaksClient.getMostPopular(limit, (err: any, products: any[]) => {
          clearTimeout(timeout);
          if (err || !products || !Array.isArray(products)) {
            resolve([]);
          } else {
            resolve(products);
          }
        });
      } catch {
        clearTimeout(timeout);
        resolve([]);
      }
    });
  }

  private bmiWidthOffset(bmi?: number): number {
    if (bmi === undefined) return 0;
    if (bmi < 18.5) return -1;
    if (bmi < 25) return 0;
    if (bmi < 30) return 2;
    return 4.5;
  }

  private async ensureScrapedData(brand: string | undefined, ctx: ExecutionContext): Promise<void> {
    if (brand) {
      const exists = this.shoeDb.getBrands().some((value) => value.toLowerCase() === brand.toLowerCase());
      if (!exists) this.shoeDb.upsertShoes(await this.scraper.scrapeSingleBrand(brand, ctx));
      return;
    }
    if (this.shoeDb.getDatabase().shoes.length === 0) {
      const scraped = await this.scraper.scrapeAll(ctx);
      if (scraped.shoes.length === 0) throw new Error('No official shoe charts could be scraped. Please try Refresh database again.');
      this.shoeDb.replaceFromScrape(scraped.shoes, scraped.sources);
    }
  }

  @Tool({
    name: 'measure_foot',
    description:
      'Measure foot length and width (mm) from photos using a known coin for scale. ' +
      'Best: one top-down photo with coin beside bare foot on a light floor. ' +
      'Alternative: separate coin photo + foot photo at the same camera distance.',
    inputSchema: z.object({
      coin_type: coinTypeSchema,
      photo_mode: z
        .enum(['combined', 'separate'])
        .default('combined')
        .describe('combined = coin+foot in one image; separate = two images'),
      combined_photo: z
        .object(fileUploadFields)
        .optional()
        .describe('Single photo with coin beside foot (required for combined mode)'),
      foot_photo: z
        .object(fileUploadFields)
        .optional()
        .describe('Foot-only photo (required for separate mode)'),
      coin_photo: z
        .object(fileUploadFields)
        .optional()
        .describe('Coin-only photo for scale (required for separate mode)'),
    }),
    examples: {
      request: {
        coin_type: 'us_quarter',
        photo_mode: 'combined',
        combined_photo: {
          file_name: 'foot-with-coin.jpg',
          file_type: 'image/jpeg',
          file_content: '<base64>',
        },
      },
    },
  })
  @Widget('foot-measurement')
  async measureFoot(input: any, ctx: ExecutionContext) {
    const coinType = input.coin_type as CoinType;

    ctx.logger.info('Measuring foot', { coin_type: coinType, mode: input.photo_mode });

    let measurement;

    if (input.photo_mode === 'separate') {
      if (!input.foot_photo || !input.coin_photo) {
        throw new Error('Separate mode requires both foot_photo and coin_photo uploads.');
      }
      const rawFootBuffer = decodeBase64File(input.foot_photo.file_content);
      const rawCoinBuffer = decodeBase64File(input.coin_photo.file_content);

      const footComp = await this.imageCompressor.compressBufferIfNeeded(rawFootBuffer, input.foot_photo.file_type || 'image/jpeg');
      const coinComp = await this.imageCompressor.compressBufferIfNeeded(rawCoinBuffer, input.coin_photo.file_type || 'image/jpeg');

      saveUpload(input.foot_photo.file_name, footComp.buffer);
      saveUpload(input.coin_photo.file_name, coinComp.buffer);

      measurement = await this.footMeasurement.measureFromSeparatePhotos(
        footComp.buffer,
        coinComp.buffer,
        coinType
      );
    } else {
      if (!input.combined_photo) {
        throw new Error('Combined mode requires combined_photo upload.');
      }
      const rawBuffer = decodeBase64File(input.combined_photo.file_content);
      const compressed = await this.imageCompressor.compressBufferIfNeeded(rawBuffer, input.combined_photo.file_type || 'image/jpeg');

      saveUpload(input.combined_photo.file_name, compressed.buffer);
      measurement = await this.footMeasurement.measureFromCombinedPhoto(compressed.buffer, coinType);
    }

    const widthCategory = this.shoeDb.inferWidthCategory(measurement.width_mm);

    const result = {
      ...measurement,
      width_category: widthCategory,
      coin_label: COIN_SPECS[coinType].label,
      sizing_tip: `Foot ratio ${measurement.ratio} — lower ratios often need wider lasts; higher ratios suit narrow/streamlined shoes.`,
    };

    // Emit event for audit logging
    emitEvent('shoefit.measurement.completed', {
      length_mm: measurement.length_mm,
      width_mm: measurement.width_mm,
      ratio: measurement.ratio,
      confidence: measurement.confidence,
      coin_type: coinType,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  @Tool({
    name: 'find_matching_shoes',
    description:
      'Search the shoe database for models whose length, width, and length/width ratio best match measured foot dimensions.',
    inputSchema: z.object({
      length_mm: z.number().min(150).max(350).describe('Foot length in millimeters'),
      width_mm: z.number().min(60).max(150).describe('Foot width in millimeters'),
      ratio: z
        .number()
        .min(2)
        .max(4)
        .optional()
        .describe('Length/width ratio — auto-calculated if omitted'),
      gender: z.enum(['men', 'women', 'unisex']).optional(),
      bmi: z.number().min(10).max(70).optional().describe('BMI used to adjust target width before matching'),
      brand_filter: z.string().optional().describe('Filter by brand name, e.g. Nike'),
      limit: z.number().min(1).max(20).default(8),
    }),
  })
  @Widget('shoe-recommendations')
  async findMatchingShoes(input: any, ctx: ExecutionContext) {
    const widthOffset = this.bmiWidthOffset(input.bmi);
    const adjustedWidth = input.width_mm + widthOffset;
    const ratio = Math.round((input.length_mm / adjustedWidth) * 1000) / 1000;

    ctx.logger.info('Finding shoe matches', {
      length_mm: input.length_mm,
      width_mm: adjustedWidth,
      ratio,
    });

    await this.ensureScrapedData(input.brand_filter, ctx);
    const matches = this.shoeDb.findMatches({
      length_mm: input.length_mm,
      width_mm: adjustedWidth,
      ratio,
      gender: input.gender as Gender | undefined,
      brand_filter: input.brand_filter,
      limit: input.limit,
    });
    return { ...matches, bmi: input.bmi, width_offset_mm: widthOffset };
  }

  @Tool({
    name: 'fitwise_recommend_shoes',
    description:
      'FitWise AI Recommendation Engine v1.0: Rank shoes using TOPSIS multi-criteria decision making based on foot geometry, functional assessment, user body profile/BMI, and medical considerations.',
    inputSchema: z.object({
      foot: z.object({
        foot_length: z.number().describe('Foot length in mm'),
        forefoot_width: z.number().describe('Forefoot width in mm'),
        heel_width: z.number().optional(),
        toe_shape: z.enum(['Egyptian', 'Greek', 'Roman', 'Square', 'German', 'Celtic']).optional(),
        hallux_angle: z.number().optional(),
        scan_confidence: z.number().optional(),
      }),
      functional: z.object({
        stability_level: z.number().default(0.8),
        balance_level: z.number().default(0.8),
        standing_hours: z.number().default(6),
        activity: z.string().default('Running'),
      }),
      profile: z.object({
        height: z.number().default(175),
        weight: z.number().default(70),
        age: z.number().default(28),
        budget_inr: z.number().optional(),
        comfort_preference: z.enum(['Soft', 'Balanced', 'Firm']).default('Balanced'),
      }),
      medical: z.object({
        diabetes: z.boolean().default(false),
        plantar_fasciitis: z.boolean().default(false),
        bunion: z.boolean().default(false),
        flat_feet: z.boolean().default(false),
        past_injury: z.boolean().default(false),
      }),
      biomechanical: z
        .object({
          arch_type: z.enum(['flat_feet', 'neutral', 'high_arch']).optional(),
          footprint_test: z.enum(['full_midfoot', 'curved', 'thin_broken']).optional(),
          tread_wear_test: z.enum(['inner_edge', 'uniform', 'outer_edge']).optional(),
          knee_alignment: z.enum(['caves_in', 'straight']).optional(),
          heel_strike: z.enum(['heavy_heel', 'midfoot_forefoot']).optional(),
          dynamic_load_kg: z.number().optional(),
        })
        .optional(),
      gender: z.enum(['men', 'women', 'unisex']).optional(),
      brand_filter: z.string().optional(),
      category_filter: z.string().optional(),
      search_query: z.string().optional(),
      limit: z.number().default(40),
    }),
  })
  @Widget('fitwise-recommendations')
  async fitWiseRecommendShoes(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing FitWise AI Recommendation Engine v1.0', {
      foot_length: input.foot?.foot_length,
      activity: input.functional?.activity,
      brand_filter: input.brand_filter,
    });

    let sneaksProducts: any[] = [];
    if (input.brand_filter) {
      sneaksProducts = await this.fetchSneaksLive(input.brand_filter, 12);
    } else {
      const sportsProducts = await this.fetchSneaksLive('Asics Kayano', 4);
      const runningProducts = await this.fetchSneaksLive('Adidas Ultraboost', 4);
      const popularProducts = await this.fetchSneaksPopular(8);
      sneaksProducts = [...sportsProducts, ...runningProducts, ...popularProducts];
    }

    const rawFootLen = input.foot?.foot_length || 260;
    const targetLen = input.foot?.foot_length ? input.foot.foot_length + 10 : 270;
    const targetWid = input.foot?.forefoot_width ? input.foot.forefoot_width : 100;
    const exactSize = calculateAccurateShoeSize(rawFootLen, input.gender);
    const recUs = exactSize.us;
    const recUk = exactSize.uk;
    const recEu = exactSize.eu;

    const liveShoeRecords = sneaksProducts
      .filter((p) => p && (p.shoeName || p.brand))
      .map((p, idx) => {
        const brand = p.brand || (p.shoeName ? p.shoeName.split(' ')[0] : 'Sneaker');
        const priceUsd = p.retailPrice || p.lowestResellPrice?.goat || p.lowestResellPrice?.stockX || 130;
        const priceInr = Math.round(priceUsd * 83);
        const priceTier = priceUsd < 100 ? 'budget' : priceUsd < 200 ? 'mid' : 'premium';
        const isSports = (p.shoeName || '').toLowerCase().includes('running') || (p.shoeName || '').toLowerCase().includes('kayano') || (p.shoeName || '').toLowerCase().includes('ultraboost') || input.functional?.activity === 'Sports';
        const category = isSports ? 'Sports' : 'Casual';

        return {
          id: p.styleID || `sneaks-live-${idx}`,
          brand: brand,
          model: p.shoeName || p.silhoutte || 'Sneaker Model',
          category: category as 'Casual' | 'Sports',
          price_tier: priceTier,
          gender: (input.gender || 'unisex') as Gender,
          size_us: recUs,
          size_uk: recUk,
          size_eu: recEu,
          length_mm: targetLen,
          width_mm: targetWid,
          ratio: Math.round((targetLen / targetWid) * 100) / 100,
          width_category: 'standard' as const,
          source: 'sneaks_api',
          url: p.resellLinks?.goat || p.resellLinks?.stockX || '',
          last_updated: new Date().toISOString(),
          image_url: p.thumbnail || '',
          price_usd: priceUsd,
          price_inr: priceInr,
          resell_prices: p.lowestResellPrice || {},
          resell_links: p.resellLinks || { goat: 'https://www.goat.com/sneakers/' + p.urlKey, stockX: 'https://stockx.com/' + p.urlKey },
          description: p.description || '',
          style_id: p.styleID || '',
          heel_counter: 'Firm' as const,
          toe_box: 'Medium Wide' as const,
          cushioning: 'High' as const,
          standing_rating: 9,
        };
      });

    // Call Gemini AI Search & Catalog Discovery Agent via GEMINI_API_KEY
    const aiAgentShoes = await this.ragCatalogAgent.searchDynamicShoesWithAiAgent({
      search_query: input.search_query,
      brand_filter: input.brand_filter,
      category_filter: input.category_filter,
      foot_length: input.foot?.foot_length,
      forefoot_width: input.foot?.forefoot_width,
    });

    const dbShoes = this.shoeDb.getDatabase().shoes;
    const runningApiShoes = this.runningShoesApi.getAllRunningShoes();
    const decathlonShoes = this.decathlonSportsApi.getDecathlonSportsShoes();
    const candidates = [...aiAgentShoes, ...liveShoeRecords, ...runningApiShoes, ...decathlonShoes, ...dbShoes];
    const eligibleShoes = this.fitWiseEngine.filterEligibleShoes(candidates, input);
    const result = this.fitWiseEngine.rankShoes(eligibleShoes, input);

    return result;
  }

  @Tool({
    name: 'search_running_shoes_api',
    description:
      'Search dedicated performance running shoes (Asics, Hoka, Brooks, Saucony, Nike, Adidas, New Balance, Puma, and Indian sports brands) by brand, support type (neutral/stability), or origin.',
    inputSchema: z.object({
      brand: z.string().optional().describe('Filter by brand name, e.g. Asics, Hoka, Brooks, HRX'),
      support_type: z.enum(['neutral', 'stability']).optional().describe('Filter by pronation support type'),
      origin: z.enum(['global', 'indian']).optional().describe('Filter by global vs Indian sports brand'),
    }),
  })
  async searchRunningShoesApi(input: { brand?: string; support_type?: string; origin?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Searching Running Shoes API', input);
    const shoes = this.runningShoesApi.searchRunningShoes(input);
    return {
      shoes,
      total: shoes.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'search_sneaks_shoes',
    description:
      'Search live sneaker models, images, style IDs, retail & StockX/GOAT resell prices across all major brands (Adidas, Yeezy, Nike, Jordan, New Balance, Puma, Asics) using SneaksAPI.',
    inputSchema: z.object({
      keyword: z.string().describe('Search keyword e.g. "Yeezy", "Adidas Samba", "Jordan 1"'),
      limit: z.number().min(1).max(20).default(10),
    }),
  })
  async searchSneaksShoes(input: { keyword: string; limit?: number }, ctx: ExecutionContext) {
    ctx.logger.info(`[SneaksAPI] Searching live sneakers for keyword: "${input.keyword}"`);
    const limit = input.limit || 10;
    const products = await this.fetchSneaksLive(input.keyword, limit);

    return {
      keyword: input.keyword,
      total_found: products.length,
      products: products.map((p) => ({
        shoe_name: p.shoeName,
        brand: p.brand,
        silhoutte: p.silhoutte,
        style_id: p.styleID,
        retail_price: p.retailPrice,
        thumbnail: p.thumbnail,
        description: p.description,
        resell_prices: p.lowestResellPrice || {},
        resell_links: p.resellLinks || {},
      })),
    };
  }

  @Tool({
    name: 'scan_foot_and_recommend',
    description:
      'Full ShoeFit workflow: measure foot from coin-calibrated photo(s), then rank shoes from the scraped brand database by fit score.',
    inputSchema: z.object({
      coin_type: coinTypeSchema,
      photo_mode: z.enum(['combined', 'separate']).default('combined'),
      combined_photo: z.object(fileUploadFields).optional(),
      foot_photo: z.object(fileUploadFields).optional(),
      coin_photo: z.object(fileUploadFields).optional(),
      gender: z.enum(['men', 'women', 'unisex']).optional(),
      bmi: z.number().min(10).max(70).optional().describe('BMI used to adjust target width before matching'),
      brand_filter: z.string().optional(),
      limit: z.number().min(1).max(12).default(6),
    }),
  })
  @Widget('shoe-fit-result')
  @InitialTool()
  async scanFootAndRecommend(input: any, ctx: ExecutionContext) {
    const measurementResult = await this.measureFoot(input, ctx);

    await this.ensureScrapedData(input.brand_filter, ctx);
    const widthOffset = this.bmiWidthOffset(input.bmi);
    const adjustedWidth = measurementResult.width_mm + widthOffset;

    const matches = this.shoeDb.findMatches({
      length_mm: measurementResult.length_mm,
      width_mm: adjustedWidth,
      ratio: Math.round((measurementResult.length_mm / adjustedWidth) * 1000) / 1000,
      gender: input.gender as Gender | undefined,
      brand_filter: input.brand_filter,
      limit: input.limit,
    });

    const result = {
      measurement: measurementResult,
      recommendations: matches,
      bmi: input.bmi,
      width_offset_mm: widthOffset,
      workflow: 'measure → ratio match → ranked shoe list',
      database_stats: this.shoeDb.getStats(),
    };

    return result;
  }

  @Tool({
    name: 'refresh_shoe_database',
    description:
      'Web-scrape official size charts from major shoe brands (Nike, Adidas, New Balance, ASICS, Brooks, Puma, Converse, Under Armour) and merge into the local shoe database.',
    inputSchema: z.object({
      force: z
        .boolean()
        .default(false)
        .describe('Force refresh even if database was recently updated'),
    }),
  })
  @RateLimit({ requests: 3, window: '1h' })
  async refreshShoeDatabase(input: { force: boolean }, ctx: ExecutionContext) {
    ctx.logger.info('Refreshing shoe database from brand websites');

    const result = await this.scraper.scrapeAll(ctx);
    this.shoeDb.replaceFromScrape(result.shoes, result.sources);

    // Emit event for audit logging
    emitEvent('shoefit.database.refreshed', {
      total_shoes: result.shoes.length,
      scraped_count: result.scraped_count,
      fallback_count: result.fallback_count,
      error_count: result.errors.length,
      timestamp: new Date().toISOString(),
    });

    return {
      status: 'success',
      message: `Database updated with ${result.shoes.length} shoe size records.`,
      scraped_from_web: result.scraped_count,
      catalog_fallback: result.fallback_count,
      sources: result.sources,
      errors: result.errors,
      stats: this.shoeDb.getStats(),
    };
  }

  @Tool({
    name: 'list_shoe_brands',
    description: 'List all shoe brands currently in the sizing database.',
    inputSchema: z.object({}),
  })
  @Cache({ ttl: 120 })
  async listShoeBrands(_input: object, ctx: ExecutionContext) {
    const brands = this.shoeDb.getBrands();
    ctx.logger.info('Listing shoe brands', { count: brands.length });
    return {
      brands,
      total: brands.length,
      stats: this.shoeDb.getStats(),
    };
  }

  @Tool({
    name: 'list_supported_coins',
    description: 'List coins supported for photo calibration with their exact diameters in millimeters.',
    inputSchema: z.object({}),
  })
  async listSupportedCoins() {
    return {
      coins: (Object.entries(COIN_SPECS) as [CoinType, CoinSpec][]).map(([id, spec]) => ({
        id,
        label: spec.label,
        diameter_mm: spec.diameter_mm,
      })),
    };
  }

  @Tool({
    name: 'scrape_shoe_image',
    description:
      'Find a real product image for a specific shoe model by scraping official brand websites and image search engines. Results are cached locally.',
    inputSchema: z.object({
      brand: z.string().describe('Shoe brand name, e.g. Nike'),
      model: z.string().describe('Shoe model name, e.g. Air Max 90'),
    }),
  })
  async scrapeShoeImage(input: { brand: string; model: string }, ctx: ExecutionContext) {
    ctx.logger.info(`[Image Scraper] Searching for image: ${input.brand} ${input.model}`);

    const result = await this.imageScraper.findProductImage(input.brand, input.model);

    ctx.logger.info(`[Image Scraper] Found image from ${result.source}${result.cached ? ' (cached)' : ''}`);

    return {
      brand: input.brand,
      model: input.model,
      image_url: result.url,
      source: result.source,
      cached: result.cached,
      cache_stats: this.imageScraper.getCacheStats(),
    };
  }

  @Tool({
    name: 'validate_photo_quality',
    description: 'Vision QA Agent pre-checks uploaded foot photo for lighting, coin visibility, contrast, and tilt angle before OpenCV measurement.',
    inputSchema: z.object({
      base64_image: z.string().describe('Base64 encoded string of foot/coin photo'),
      mime_type: z.string().default('image/jpeg').describe('MIME type of uploaded photo'),
    }),
  })
  async validatePhotoQuality(input: { base64_image: string; mime_type?: string }) {
    const result = await this.visionQa.validateFootPhoto(input.base64_image, input.mime_type || 'image/jpeg');
    return result;
  }

  @Tool({
    name: 'ask_podiatrist_agent',
    description: 'Conversational Podiatrist Agent conducts an adaptive single-question diagnostic interview to analyze biomechanical foot needs.',
    inputSchema: z.object({
      history: z.array(z.object({ role: z.string(), text: z.string() })).default([]).describe('Previous conversation history'),
      latest_message: z.string().describe('User latest text reply'),
    }),
  })
  async askPodiatristAgent(input: { history: Array<{ role: string; text: string }>; latest_message: string }) {
    const response = await this.podiatristAgent.conductDiagnosticChat(input.history || [], input.latest_message);
    return response;
  }

  @Tool({
    name: 'get_curated_top3_shoes',
    description: 'Personal Shopper AI Agent synthesizes TOPSIS candidates with foot dimensions to curate the final Top 3 shoes with custom justifications.',
    inputSchema: z.object({
      candidates: z.array(z.any()).describe('List of TOPSIS candidate shoe matches'),
      fit_profile: z.record(z.any()).describe('User complete foot & biomechanical fit profile'),
    }),
  })
  async getCuratedTop3Shoes(input: { candidates: any[]; fit_profile: any }) {
    const curated = await this.personalShopperAgent.curateTop3Recommendations(input.candidates, input.fit_profile);
    return {
      top_3_curated: curated,
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'compress_foot_image',
    description: 'Image Compression Agent resizes and optimizes high-res foot photos exceeding size thresholds while preserving aspect ratio for scale calibration.',
    inputSchema: z.object({
      base64_image: z.string().describe('Base64 encoded string of foot/coin photo'),
      mime_type: z.string().default('image/jpeg').describe('MIME type of uploaded photo'),
    }),
  })
  async compressFootImage(input: { base64_image: string; mime_type?: string }) {
    const result = await this.imageCompressor.compressBase64ImageIfNeeded(input.base64_image, input.mime_type || 'image/jpeg');
    return {
      was_compressed: result.wasCompressed,
      original_size_kb: result.originalSizeKb,
      compressed_size_kb: result.compressedSizeKb,
      mime_type: result.mimeType,
      compressed_base64: result.base64,
      dimensions: result.dimensions,
    };
  }

  @Tool({
    name: 'get_shoe_fact',
    description: 'Agentic AI generates a unique, fascinating fact about shoe biomechanics, sneaker history, or foot health.',
    inputSchema: z.object({
      category: z.string().optional().describe('Optional category filter: biomechanics, history, health, cushioning'),
    }),
  })
  async getShoeFact(input: { category?: string }) {
    const prompt = `
      Provide ONE fascinating, 1-2 sentence fun fact about ${input.category || 'foot biomechanics, athletic shoes, or sneaker history'}.
      Make it engaging, surprising, and educational. Output ONLY the fact string, no quotes or titles.
    `;

    try {
      const fact = await this.llmOrchestrator.generateText(prompt);
      return {
        fact: fact.trim() || 'Your feet expand by up to half a shoe size during a 10km run due to dynamic blood flow!',
        category: input.category || 'general',
        timestamp: new Date().toISOString(),
      };
    } catch {
      const staticFacts = [
        'Your feet expand by up to half a shoe size during a 10km run due to dynamic blood flow!',
        'The average human takes 8,000 to 10,000 steps a day, which adds up to about 115,000 miles in a lifetime—enough to walk around the equator 4 times!',
        'There are 26 bones, 33 joints, and over 100 muscles, tendons, and ligaments in a single human foot!',
        'EVA foam in running shoes loses about 50% of its responsiveness after 300-500 miles of impact.',
        'Human feet naturally splay outward by 3-5mm under heavy load to absorb ground reaction forces.',
      ];
      const randomFact = staticFacts[Math.floor(Math.random() * staticFacts.length)];
      return {
        fact: randomFact,
        category: 'general',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
