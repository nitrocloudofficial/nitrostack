import { Injectable } from '@nitrostack/core';
import { LlmOrchestratorService } from './llm-orchestrator.service.js';
import { ShoeRecord } from '../types/shoe.types.js';

@Injectable()
export class RagCatalogAgentService {
  constructor(private readonly llm: LlmOrchestratorService) {}

  async enrichShoeRecord(shoe: ShoeRecord): Promise<ShoeRecord & { qualitative_insights: string }> {
    const prompt = `
      Given this shoe model: ${shoe.brand} ${shoe.model} (${shoe.category}).
      Provide a concise 1-sentence qualitative breakdown of its midsole foam density, upper breathability, and arch support characteristics.
    `;

    try {
      const insights = await this.llm.generateText(prompt);
      return {
        ...shoe,
        qualitative_insights: insights.trim(),
      };
    } catch {
      return {
        ...shoe,
        qualitative_insights: 'Balanced cushioning with engineered breathable mesh upper.',
      };
    }
  }

  async searchDynamicShoesWithAiAgent(query: {
    search_query?: string;
    brand_filter?: string;
    category_filter?: string;
    foot_length?: number;
    forefoot_width?: number;
  }): Promise<ShoeRecord[]> {
    const searchTerm = query.search_query || query.brand_filter || query.category_filter || 'running sneakers';
    const prompt = `
      You are an expert AI Sneaker Search & Catalog Discovery Agent.
      Search for 6 REAL, highly popular sneaker models for the search query: "${searchTerm}".
      Return ONLY a JSON array containing 6 shoe objects without markdown formatting or extra text.
      Each object must adhere to this exact structure:
      [
        {
          "id": "nike-air-zoom-pegasus-40",
          "brand": "Nike",
          "model": "Air Zoom Pegasus 40",
          "gender": "unisex",
          "size_us": 9.5,
          "size_uk": 8.5,
          "size_eu": 43,
          "length_mm": 272,
          "width_mm": 100,
          "width_category": "standard",
          "ratio": 2.72,
          "category": "Running",
          "toe_box": "Medium Wide",
          "cushioning": "High",
          "stack_height": 33,
          "heel_drop": 10,
          "price_inr": 11895,
          "price_usd": 140,
          "url": "https://www.nike.com/in/",
          "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
          "source": "Gemini AI Agent Live Search",
          "last_updated": "2026-07-26"
        }
      ]
    `;

    try {
      const rawJson = await this.llm.generateText(prompt);
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ShoeRecord[];
      }
    } catch (err: any) {
      console.warn('[RagCatalogAgentService] Dynamic AI shoe search fallback:', err.message);
    }

    return [];
  }
}
