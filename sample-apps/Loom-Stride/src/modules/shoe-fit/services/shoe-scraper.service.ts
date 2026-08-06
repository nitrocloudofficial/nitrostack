import * as cheerio from 'cheerio';
import { Injectable, ExecutionContext } from '@nitrostack/core';
import type { ShoeRecord, Gender } from '../types/shoe.types.js';
import { ImageScraperService } from './image-scraper.service.js';

interface BrandScraper {
  brand: string;
  url: string;
  parse: (html: string, brand: string) => ShoeRecord[];
}

const BRAND_SIZE_CHARTS: BrandScraper[] = [
  {
    brand: 'Nike',
    url: 'https://www.nike.com/size-fit/mens-footwear',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'Adidas',
    url: 'https://www.adidas.com/us/help/size-charts/shoes',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'New Balance',
    url: 'https://www.newbalance.com/size-guide.html',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'ASICS',
    url: 'https://www.asics.com/us/en-us/size-guide/',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'Brooks',
    url: 'https://www.brooksrunning.com/en_us/size-charts/',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'Puma',
    url: 'https://us.puma.com/us/en/help/size-guide',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'Converse',
    url: 'https://www.converse.com/size-guide',
    parse: parseGenericSizeTable,
  },
  {
    brand: 'Under Armour',
    url: 'https://www.underarmour.com/en-us/size-charts',
    parse: parseGenericSizeTable,
  },
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseUsSize(raw: string): number | null {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseMm(raw: string): number | null {
  const str = raw.toLowerCase().replace(/,/g, '.');
  const mmMatch = str.match(/(\d+(?:\.\d+)?)\s*mm/);
  if (mmMatch) return parseFloat(mmMatch[1]);
  
  const cmMatch = str.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) return parseFloat(cmMatch[1]) * 10;
  
  const genericMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (genericMatch) {
    const val = parseFloat(genericMatch[1]);
    if (val < 15) return val * 25.4; // likely inches
    if (val < 40) return val * 10; // likely cm
    return val;
  }
  return null;
}

function parseGenericSizeTable(html: string, brand: string): ShoeRecord[] {
  const $ = cheerio.load(html);
  const shoes: ShoeRecord[] = [];
  const now = new Date().toISOString();
  const pageUrl = BRAND_SIZE_CHARTS.find((entry) => entry.brand === brand)?.url ?? '';
  const imageUrl = $('meta[property="og:image"], meta[name="twitter:image"]').first().attr('content') ?? '';

  $('table').each((_, table) => {
    const headers: string[] = [];
    $(table)
      .find('tr')
      .first()
      .find('th, td')
      .each((__, cell) => {
        headers.push($(cell).text().trim().toLowerCase());
      });

    const usIdx = headers.findIndex((h) => h.includes('us') || h.includes('size'));
    const lengthIdx = headers.findIndex((h) => h.includes('length') || h.includes('foot'));
    const widthIdx = headers.findIndex((h) => h.includes('width'));

    if (usIdx === -1) return;

    $(table)
      .find('tr')
      .slice(1)
      .each((rowIdx, row) => {
        const cells: string[] = [];
        $(row)
          .find('td, th')
          .each((__, cell) => {
            cells.push($(cell).text().trim());
          });

        const sizeUs = parseUsSize(cells[usIdx] ?? '');
        if (!sizeUs || sizeUs < 4 || sizeUs > 16) return;

        let lengthMm =
          lengthIdx >= 0 ? parseMm(cells[lengthIdx] ?? '') : null;
        let widthMm = widthIdx >= 0 ? parseMm(cells[widthIdx] ?? '') : null;

        if (!lengthMm) {
          lengthMm = 220 + (sizeUs - 6) * 8.47;
        }
        if (!widthMm) {
          widthMm = 88 + (sizeUs - 6) * 1.6;
        }

        const ratio = Math.round((lengthMm / widthMm) * 1000) / 1000;
        const model = `${brand} official size chart`;

        shoes.push({
          id: `${slugify(brand)}-official-size-chart-${sizeUs}-${rowIdx}`,
          brand,
          model,
          gender: 'unisex',
          size_us: sizeUs,
          size_uk: sizeUs - 1.0,
          size_eu: Math.round(sizeUs + 33),
          length_mm: Math.round(lengthMm * 10) / 10,
          width_mm: Math.round(widthMm * 10) / 10,
          width_category: widthMm < 95 ? 'narrow' : widthMm < 103 ? 'standard' : 'wide',
          ratio,
          url: pageUrl,
          image_url: imageUrl,
          image_source: imageUrl ? 'official_page_og_image' : undefined,
          scraped_dimensions: {
            us_size: cells[usIdx] ?? '',
            length: lengthIdx >= 0 ? cells[lengthIdx] ?? '' : `${lengthMm} mm (derived from official size chart)`,
            width: widthIdx >= 0 ? cells[widthIdx] ?? '' : `${widthMm} mm (estimated; source chart did not publish width)`,
          },
          source: 'official_web_scrape',
          last_updated: now,
        });
      });
  });

  return shoes;
}

@Injectable()
export class ShoeScraperService {
  constructor(private readonly imageScraper: ImageScraperService) {}

  private async enrichImages(shoes: ShoeRecord[]): Promise<ShoeRecord[]> {
    const seen = new Map<string, Promise<{ width?: number; height?: number }>>();
    await Promise.all(shoes.map(async (shoe) => {
      if (!shoe.image_url) return;
      const task = seen.get(shoe.image_url) ?? this.imageScraper.getImageDimensions(shoe.image_url);
      seen.set(shoe.image_url, task);
      const dimensions = await task;
      shoe.image_width_px = dimensions.width;
      shoe.image_height_px = dimensions.height;
    }));
    return shoes;
  }
  async scrapeAll(ctx?: ExecutionContext): Promise<{
    shoes: ShoeRecord[];
    sources: string[];
    scraped_count: number;
    fallback_count: number;
    errors: string[];
  }> {
    const allShoes: ShoeRecord[] = [];
    const sources: string[] = [];
    const errors: string[] = [];
    let scrapedCount = 0;

    for (const scraper of BRAND_SIZE_CHARTS) {
      try {
        ctx?.logger?.info(`Scraping ${scraper.brand}`, { url: scraper.url });
        const response = await fetch(scraper.url, {
          headers: {
            'User-Agent':
              'ShoeFit-MCP/2.0 (Educational sizing aggregator; +https://nitrostack.ai)',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const parsed = scraper.parse(html, scraper.brand);
        if (parsed.length > 0) {
        allShoes.push(...await this.enrichImages(parsed));
          sources.push(scraper.url);
          scrapedCount += parsed.length;
          ctx?.logger?.info(`Parsed ${parsed.length} entries from ${scraper.brand}`);
        } else {
          throw new Error('No table data found');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${scraper.brand}: ${message}`);
        ctx?.logger?.warn(`Scrape failed for ${scraper.brand}; no synthetic catalog will be stored`, {
          error: message,
        });
      }
    }

    return {
      shoes: allShoes,
      sources,
      scraped_count: scrapedCount,
      fallback_count: 0,
      errors,
    };
  }

  async scrapeSingleBrand(brand: string, ctx?: ExecutionContext): Promise<ShoeRecord[]> {
    const scraper = BRAND_SIZE_CHARTS.find(
      (b) => b.brand.toLowerCase() === brand.toLowerCase()
    );
    if (!scraper) {
      throw new Error(`No official scraper is configured for ${brand}. Choose a supported brand or refresh the full database.`);
    }

    try {
      ctx?.logger?.info(`[Scraper Agent] Initiating live scrape for ${scraper.brand}...`, { url: scraper.url });
      const response = await fetch(scraper.url, {
        headers: {
          'User-Agent':
            'ShoeFit-MCP/2.0 (Educational sizing aggregator; +https://nitrostack.ai)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      ctx?.logger?.info(`[Scraper Agent] Successfully loaded size page for ${scraper.brand}. Parsing HTML tables...`);
      const parsed = scraper.parse(html, scraper.brand);
      if (parsed.length > 0) {
        ctx?.logger?.info(`[Scraper Agent] Successfully parsed ${parsed.length} items from ${scraper.brand}.`);
        return this.enrichImages(parsed);
      } else {
        throw new Error('No sizing table content matched standard headers.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Official scrape for ${scraper.brand} failed: ${message}`);
    }
  }
}
