import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ClaimInput } from '../../shared/trust-context.interface.js';
import OpenAI from 'openai';

@Injectable()
export class ListingService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });

  private async searchWeb(query: string): Promise<string> {
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await res.text();
      // Extract text from the result snippets class="result__snippet"
      const snippets = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g) || [];
      const cleaned = snippets.map(s => s.replace(/<[^>]+>/g, '').trim()).slice(0, 4).join('\n');
      return cleaned || 'No results found on the web.';
    } catch (e) {
      return 'Web search failed.';
    }
  }

  @Tool({
    name: 'priceAnomalyCheck',
    description: 'Analyze listing for price anomalies and inconsistencies',
    inputSchema: z.object({
      title: z.string().describe('Title of the listing'),
      description: z.string().describe('Description of the listing'),
      price: z.number().describe('Listed price'),
      category: z.string().describe('Category of the item (e.g. macbook_air_m2, iphone_14_pro, iphone_13)')
    })
  })
  async priceAnomalyCheck(input: { title: string; description: string; price: number; category: string; region?: string; providedMarketMedian?: number }, _ctx?: ExecutionContext): Promise<ClaimInput[]> {
    let urgency = false;
    let mismatch = false;
    let isDangerouslyLow = false;
    let isDangerouslyHigh = false;
    let estimatedMedian = 0;

    // Heuristic pre-check for urgency
    const textToScan = `${input.title} ${input.description}`.toLowerCase();
    if (/(urgent|must sell|relocat|kal |jaldi)/i.test(textToScan)) {
      urgency = true;
    }

    // 1. If the real market price was already extracted natively from the page DOM (like in the demo dashboard),
    // use it immediately as the ultimate source of truth, bypassing the LLM and the scraper!
    // 1. If a market median was provided from page metadata, sanity check it against brand benchmarks and apply 20% threshold
    if (input.providedMarketMedian && input.providedMarketMedian > 0) {
      console.log(`[ListingService] Evaluating market median provided natively: ₹${input.providedMarketMedian}`);
      estimatedMedian = input.providedMarketMedian;

      // Brand Benchmark Sanity Check
      const brandBenchmarks: Array<{ keywords: string[]; benchmarkMedian: number }> = [
        { keywords: ['realme', 'redmi', 'poco', 'oppo', 'vivo', 'iqoo', 'narzo', 'galaxy a', 'redmi note'], benchmarkMedian: 10500 },
        { keywords: ['iphone 14 pro', 'iphone 14', 'iphone 15'], benchmarkMedian: 65000 },
        { keywords: ['iphone 13', 'iphone 12', 'iphone 11'], benchmarkMedian: 42000 },
        { keywords: ['macbook air m2', 'macbook m2'], benchmarkMedian: 75000 },
        { keywords: ['macbook air m1', 'macbook m1'], benchmarkMedian: 52000 },
        { keywords: ['macbook pro'], benchmarkMedian: 95000 },
        { keywords: ['galaxy s23', 'samsung s23', 'samsung s22'], benchmarkMedian: 45000 }
      ];

      const textToScan = `${input.category} ${input.title}`.toLowerCase();
      const matchedBrand = brandBenchmarks.find(b => b.keywords.some(kw => textToScan.includes(kw)));
      if (matchedBrand && (estimatedMedian > matchedBrand.benchmarkMedian * 2.2 || estimatedMedian < matchedBrand.benchmarkMedian * 0.3)) {
        console.log(`[ListingService] Provided median ₹${estimatedMedian} failed sanity check for '${matchedBrand.keywords[0]}'. Overriding with benchmark median ₹${matchedBrand.benchmarkMedian}`);
        estimatedMedian = matchedBrand.benchmarkMedian;
      }

      if (input.price > 0 && input.price <= estimatedMedian * 0.80) {
        isDangerouslyLow = true;
      } else if (input.price > 0 && input.price >= estimatedMedian * 1.20) {
        isDangerouslyHigh = true;
      }
    } else {
      // 2. Otherwise, attempt to use the Agentic AI / Live Web Scraper
      try {
      const systemInstruction = `Analyze this listing for manipulation patterns and evaluate the price.
You are an expert market analyst. You MUST use the 'search_google' tool to check the current market prices for this exact item in INR before deciding if it's an anomaly.

Evaluate the listed price: ₹${input.price}
1. Estimate the typical market price (median) for this exact item in INR using Google.
2. Determine if the listed price is a major anomaly. A price is anomalous if it is more than 30% below OR 30% above the estimated market median.

Also detect:
3. Urgency language ("urgent", "must sell today", "relocating", "kal", "jaldi", etc.)
4. Title-description mismatches or contradictory information
5. Unrealistic discounts

Output JSON exactly in this format:
{
  "estimatedMarketMedian": number,
  "isDangerouslyLow": boolean,
  "isDangerouslyHigh": boolean,
  "urgency": boolean,
  "mismatch": boolean,
  "reasoning": string
}`;

      let messages: any[] = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Title: ${input.title}\nDescription: ${input.description}\nPrice: ₹${input.price}\nCategory: ${input.category}` }
      ];

      let response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        tools: [
          {
            type: "function",
            function: {
              name: "search_google",
              description: "Search Google for current market prices of an item in INR",
              parameters: {
                type: "object",
                properties: { query: { type: "string", description: "Search query, e.g. 'MacBook Air M2 used price in India'" } },
                required: ["query"]
              }
            }
          }
        ],
        tool_choice: "auto"
      });

      // Handle tool call if the agent decides to search Google
      if (response.choices[0].message.tool_calls) {
        const toolCall = response.choices[0].message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[ListingService] LLM invoked Google Search with query: "${args.query}"`);
        
        messages.push(response.choices[0].message);
        
        const searchResultText = await this.searchWeb(args.query);
        const searchResult = `Web Search Results for "${args.query}":\n${searchResultText}`;

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: searchResult
        });

        // Get final JSON response after search
        response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
          response_format: { type: 'json_object' }
        });
      }

      // If it didn't call the tool, we need to enforce JSON format on the first response
      let finalContent = response.choices[0].message.content;
      if (!finalContent) {
        // Fallback if the model failed to output content after tool call
        finalContent = '{}';
      } else if (!finalContent.includes('{')) {
        // Enforce JSON format if it somehow returned raw text
        const jsonResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [...messages, { role: 'user', content: 'Output the final result in the requested JSON format.' }],
            response_format: { type: 'json_object' }
        });
        finalContent = jsonResponse.choices[0].message.content || '{}';
      }

      const analysis = JSON.parse(finalContent);
      urgency = urgency || analysis.urgency || false;
      mismatch = analysis.mismatch || false;
      isDangerouslyLow = analysis.isDangerouslyLow || false;
      isDangerouslyHigh = analysis.isDangerouslyHigh || false;
      estimatedMedian = analysis.estimatedMarketMedian || 0;
    } catch (e: any) {
      console.error('[ListingService] AI Agent analysis failed (likely invalid mock-key):', e.message);
      console.log('[ListingService] Falling back to manual web scraping for real market prices...');
      
      // Comprehensive brand category benchmark table (INR medians)
      const brandBenchmarks: Array<{ keywords: string[]; benchmarkMedian: number; maxReasonablePrice: number }> = [
        { keywords: ['realme', 'redmi', 'poco', 'oppo', 'vivo', 'iqoo', 'narzo', 'galaxy a', 'redmi note'], benchmarkMedian: 10500, maxReasonablePrice: 20000 },
        { keywords: ['iphone 14 pro', 'iphone 14', 'iphone 15'], benchmarkMedian: 65000, maxReasonablePrice: 130000 },
        { keywords: ['iphone 13', 'iphone 12', 'iphone 11'], benchmarkMedian: 42000, maxReasonablePrice: 70000 },
        { keywords: ['macbook air m2', 'macbook m2'], benchmarkMedian: 75000, maxReasonablePrice: 120000 },
        { keywords: ['macbook air m1', 'macbook m1'], benchmarkMedian: 52000, maxReasonablePrice: 80000 },
        { keywords: ['macbook pro'], benchmarkMedian: 95000, maxReasonablePrice: 180000 },
        { keywords: ['galaxy s23', 'samsung s23', 'samsung s22'], benchmarkMedian: 45000, maxReasonablePrice: 90000 },
        { keywords: ['study table', 'wooden table', 'desk'], benchmarkMedian: 2200, maxReasonablePrice: 8000 },
        { keywords: ['cycle', 'bicycle', 'hero sprint'], benchmarkMedian: 3500, maxReasonablePrice: 12000 }
      ];

      const textToScanCategory = `${input.category} ${input.title}`.toLowerCase();
      const matchedBrand = brandBenchmarks.find(b => b.keywords.some(kw => textToScanCategory.includes(kw)));

      const query = `${input.category || input.title} used price India`;
      const searchResultText = await this.searchWeb(query);
      
      // Extract all plausible price numbers from the web results
      const priceRegex = /(?:₹|Rs\.?|INR)?\s*([1-9][\d,]{3,6})/gi;
      const matches = [...searchResultText.matchAll(priceRegex)];
      let prices = matches
        .map(m => parseInt(m[1].replace(/,/g, ''), 10))
        .filter(p => p > 1000 && p < 200000 && p !== 2023 && p !== 2024 && p !== 2025 && p !== 2026 && p !== 2027);
      
      // If we matched a budget brand (e.g. Realme), filter out non-sensical high numbers from random search snippets
      if (matchedBrand) {
        prices = prices.filter(p => p <= matchedBrand.maxReasonablePrice * 1.5);
      }

      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        estimatedMedian = prices[Math.floor(prices.length / 2)];
        
        // Sanity Check: If calculated web median is > 2x brand benchmark, fall back to brand benchmark median
        if (matchedBrand && (estimatedMedian > matchedBrand.benchmarkMedian * 2 || estimatedMedian < matchedBrand.benchmarkMedian * 0.3)) {
          console.log(`[ListingService] Scraped web median ₹${estimatedMedian} failed sanity check for '${matchedBrand.keywords[0]}'. Overriding with benchmark median ₹${matchedBrand.benchmarkMedian}`);
          estimatedMedian = matchedBrand.benchmarkMedian;
        }
      } else if (matchedBrand) {
        estimatedMedian = matchedBrand.benchmarkMedian;
        console.log(`[ListingService] Web search returned no valid prices. Using category benchmark median ₹${estimatedMedian}`);
      }

      if (estimatedMedian > 0) {
        // Flag if price is > 20% below or above market median
        if (input.price > 0 && input.price <= estimatedMedian * 0.80) {
          isDangerouslyLow = true;
          console.log(`[ListingService] Price Anomaly: Listed ₹${input.price} is dangerously lower than Web Median ₹${estimatedMedian}`);
        } else if (input.price > 0 && input.price >= estimatedMedian * 1.20) {
          isDangerouslyHigh = true;
          console.log(`[ListingService] Price Anomaly: Listed ₹${input.price} is dangerously higher than Web Median ₹${estimatedMedian}`);
        } else {
          console.log(`[ListingService] Listed ₹${input.price} is within normal bounds of Web Median ₹${estimatedMedian}`);
        }
      }
    }
    } // End of else block for agentic check

    const claims: ClaimInput[] = [];

    if (isDangerouslyLow || isDangerouslyHigh) {
      const deviationVal = estimatedMedian > 0 ? Math.round(((input.price - estimatedMedian) / estimatedMedian) * 100) : (isDangerouslyLow ? -50 : 50);
      const deviationStr = deviationVal > 0 ? `+${deviationVal}%` : `${deviationVal}%`;
      const anomalyType = isDangerouslyLow ? 'suspiciously low' : 'suspiciously high';
      claims.push({
        source: 'listing.priceAnomalyCheck',
        type: 'PRICE_ANOMALY',
        fact: 'price_deviation',
        value: `${deviationStr}`,
        description: `Price is ${anomalyType} (${deviationStr}). Listed: ₹${input.price}, Estimated Market: ₹${estimatedMedian}.`,
        severity: 'HIGH'
      });
    } else if (estimatedMedian > 0 && input.price > 0) {
      const deviationVal = Math.round(((input.price - estimatedMedian) / estimatedMedian) * 100);
      const deviationStr = deviationVal > 0 ? `+${deviationVal}%` : `${deviationVal}%`;
      claims.push({
        source: 'listing.priceAnomalyCheck',
        type: 'PRICE_NORMAL',
        fact: 'price_normal',
        value: `₹${input.price.toLocaleString('en-IN')} (${deviationStr} from ₹${estimatedMedian.toLocaleString('en-IN')} market median)`,
        description: `Price is within normal range (${deviationStr} from market average).`,
        severity: 'INFO'
      });
    }

    if (urgency) {
      claims.push({
        source: 'listing.priceAnomalyCheck',
        type: 'URGENCY',
        fact: 'urgency_language_detected',
        value: true,
        description: 'Listing contains high-pressure urgency language.',
        severity: 'MEDIUM'
      });
    }

    if (mismatch) {
      claims.push({
        source: 'listing.priceAnomalyCheck',
        type: 'MISMATCH',
        fact: 'title_description_mismatch',
        value: true,
        description: 'Title and description contain mismatches or contradictory information.',
        severity: 'HIGH'
      });
    }

    return claims;
  }
}
