import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { Injectable, OnModuleInit } from '@nitrostack/core';
import { createRequire } from 'module';
import { DATA_DIR } from '../../../common/file.utils.js';

const require = createRequire(import.meta.url);
const SneaksAPI = require('sneaks-api');

const CACHE_PATH = path.join(DATA_DIR, 'image-cache.json');

interface ImageCacheEntry {
  url: string;
  source: string;
  timestamp: string;
}

type ImageCache = Record<string, ImageCacheEntry>;

/**
 * Official brand product page URL patterns.
 * We search these domains for real shoe product images.
 */
const BRAND_SEARCH_DOMAINS: Record<string, string> = {
  nike: 'nike.com',
  adidas: 'adidas.com',
  'new balance': 'newbalance.com',
  asics: 'asics.com',
  brooks: 'brooksrunning.com',
  puma: 'puma.com',
  converse: 'converse.com',
  'under armour': 'underarmour.com',
  reebok: 'reebok.com',
  skechers: 'skechers.com',
};

@Injectable()
export class ImageScraperService implements OnModuleInit {
  private cache: ImageCache = {};
  private sneaks: any;

  async onModuleInit(): Promise<void> {
    this.loadCache();
    try {
      this.sneaks = new SneaksAPI();
    } catch {
      this.sneaks = null;
    }
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        this.cache = JSON.parse(raw);
      }
    } catch {
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
      fs.writeFileSync(CACHE_PATH, JSON.stringify(this.cache, null, 2));
    } catch (err) {
      console.warn('[ImageScraper] Failed to save cache:', err);
    }
  }

  private getCacheKey(brand: string, model: string): string {
    return `${brand.toLowerCase()}-${model.toLowerCase()}`
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Find a real product image for a shoe model.
   * Strategy:
   * 1. Check local cache
   * 2. Try SneaksAPI for authentic sneaker images & product data
   * 3. Try scraping search engine for images
   * 4. Fall back to DuckDuckGo instant answer API
   * 5. Return a placeholder SVG data URI if all else fails
   */
  async findProductImage(brand: string, model: string): Promise<{ url: string; source: string; cached: boolean }> {
    const key = this.getCacheKey(brand, model);

    // 1. Cache check
    if (this.cache[key]) {
      return { url: this.cache[key].url, source: this.cache[key].source, cached: true };
    }

    // 2. Try SneaksAPI
    const sneaksUrl = await this.scrapeSneaksApi(brand, model);
    if (sneaksUrl) {
      this.cache[key] = { url: sneaksUrl, source: 'sneaks_api', timestamp: new Date().toISOString() };
      this.saveCache();
      return { url: sneaksUrl, source: 'sneaks_api', cached: false };
    }

    // 3. Try scraping a search engine for images
    const searchUrl = await this.scrapeSearchImage(brand, model);
    if (searchUrl) {
      this.cache[key] = { url: searchUrl, source: 'web_scrape', timestamp: new Date().toISOString() };
      this.saveCache();
      return { url: searchUrl, source: 'web_scrape', cached: false };
    }

    // 4. Try DuckDuckGo instant answers
    const ddgUrl = await this.scrapeDuckDuckGo(brand, model);
    if (ddgUrl) {
      this.cache[key] = { url: ddgUrl, source: 'duckduckgo', timestamp: new Date().toISOString() };
      this.saveCache();
      return { url: ddgUrl, source: 'duckduckgo', cached: false };
    }

    // 5. Generate a branded placeholder SVG
    const placeholder = this.generatePlaceholderSvg(brand, model);
    return { url: placeholder, source: 'placeholder', cached: false };
  }

  /**
   * Fetch image using SneaksAPI
   */
  private async scrapeSneaksApi(brand: string, model: string): Promise<string | null> {
    if (!this.sneaks) return null;
    return new Promise((resolve) => {
      const keyword = `${brand} ${model}`.trim();
      const timeout = setTimeout(() => resolve(null), 5000);
      try {
        this.sneaks.getProducts(keyword, 5, (err: any, products: any[]) => {
          clearTimeout(timeout);
          if (err || !products || !Array.isArray(products) || products.length === 0) {
            return resolve(null);
          }
          const valid = products.find((p) => p && p.thumbnail && typeof p.thumbnail === 'string' && p.thumbnail.startsWith('http'));
          if (valid) {
            resolve(valid.thumbnail);
          } else {
            resolve(null);
          }
        });
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  /** Reads the intrinsic dimensions of a scraped raster image when the host permits it. */
  async getImageDimensions(url: string): Promise<{ width?: number; height?: number }> {
    if (!url.startsWith('http')) return {};
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ShoeFit-MCP/3.0' },
        signal: AbortSignal.timeout(8000),
      });
      const length = Number(response.headers.get('content-length') || 0);
      if (!response.ok || (length && length > 8_000_000)) return {};
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return {};
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      return { width: metadata.width, height: metadata.height };
    } catch {
      return {};
    }
  }

  /**
   * Scrape Bing Images search for a product photo.
   * Bing Images is more scraper-friendly than Google Images.
   */
  private async scrapeSearchImage(brand: string, model: string): Promise<string | null> {
    try {
      const query = encodeURIComponent(`${brand} ${model} shoe official product photo`);
      const searchUrl = `https://www.bing.com/images/search?q=${query}&first=1&count=5`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Bing images stores src in data attributes or img.mimg
      const candidates: string[] = [];

      // Try to find image URLs from Bing's image results
      $('img.mimg').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && src.startsWith('http') && src.length > 20) {
          candidates.push(src);
        }
      });

      // Also try the thumbnail URLs from Bing
      $('a.iusc').each((_, el) => {
        const m = $(el).attr('m');
        if (m) {
          try {
            const parsed = JSON.parse(m);
            if (parsed.murl && parsed.murl.startsWith('http')) {
              candidates.push(parsed.murl);
            }
          } catch { /* skip */ }
        }
      });

      // Filter for likely product images (decent resolution, not icons)
      const brandDomain = BRAND_SEARCH_DOMAINS[brand.toLowerCase()];
      
      // Prefer official brand domain images if available
      if (brandDomain) {
        const official = candidates.find(u => u.includes(brandDomain));
        if (official) return official;
      }

      // Otherwise take the first reasonable candidate
      return candidates[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Try DuckDuckGo instant answer API for an image.
   */
  private async scrapeDuckDuckGo(brand: string, model: string): Promise<string | null> {
    try {
      const query = encodeURIComponent(`${brand} ${model} shoe`);
      const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'ShoeFit-MCP/2.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data = await response.json() as any;
      if (data.Image && data.Image.startsWith('http')) {
        return data.Image;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a branded SVG placeholder with the shoe model name.
   */
  private generatePlaceholderSvg(brand: string, model: string): string {
    const colors: Record<string, string> = {
      nike: '#F97316',
      adidas: '#3B82F6',
      'new balance': '#EF4444',
      asics: '#6366F1',
      brooks: '#10B981',
      puma: '#8B5CF6',
      converse: '#EC4899',
      'under armour': '#F59E0B',
      reebok: '#14B8A6',
      skechers: '#64748B',
    };
    const color = colors[brand.toLowerCase()] || '#6366F1';
    const shortModel = model.length > 18 ? model.slice(0, 18) + '…' : model;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}22"/>
          <stop offset="100%" stop-color="${color}08"/>
        </linearGradient>
      </defs>
      <rect width="400" height="280" rx="16" fill="url(#bg)"/>
      <text x="200" y="120" text-anchor="middle" font-family="sans-serif" font-size="48" fill="${color}" opacity="0.3">👟</text>
      <text x="200" y="175" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="${color}">${brand}</text>
      <text x="200" y="200" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${color}99">${shortModel}</text>
    </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Bulk scrape images for multiple shoe models.
   * Used during database seeding.
   */
  async scrapeImagesForModels(models: Array<{ brand: string; model: string }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const uniqueModels = new Map<string, { brand: string; model: string }>();

    // Deduplicate by brand+model
    for (const m of models) {
      const key = this.getCacheKey(m.brand, m.model);
      if (!uniqueModels.has(key)) {
        uniqueModels.set(key, m);
      }
    }

    // Process in serial to avoid rate limiting
    for (const [key, { brand, model }] of uniqueModels) {
      const result = await this.findProductImage(brand, model);
      results.set(key, result.url);
    }

    return results;
  }

  /**
   * Get cache stats.
   */
  getCacheStats(): { total: number; bySource: Record<string, number> } {
    const entries = Object.values(this.cache);
    const bySource: Record<string, number> = {};
    for (const entry of entries) {
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
    }
    return { total: entries.length, bySource };
  }
}
