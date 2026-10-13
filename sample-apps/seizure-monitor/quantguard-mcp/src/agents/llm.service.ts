import { Injectable } from '@nitrostack/core';

@Injectable()
export class LlmService {
  /**
   * Complete a prompt using Gemini or fallback template
   */
  async generateText(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      try {
        if (process.env.GEMINI_API_KEY) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
              }),
              signal: AbortSignal.timeout(5000)
            }
          );
          
          if (response.ok) {
            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return text.trim();
            }
          }
        } else if (process.env.OPENAI_API_KEY) {
          const response = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
              }),
              signal: AbortSignal.timeout(5000)
            }
          );

          if (response.ok) {
            const data = await response.json() as any;
            const text = data.choices?.[0]?.message?.content;
            if (text) {
              return text.trim();
            }
          }
        }
      } catch (error) {
        // Fall back to template generation on API error
      }
    }

    // High-quality fallback template generation
    return this.generateFallbackExplanation(prompt);
  }

  /**
   * Fallback rule-based text generation to ensure offline/mock demos never break
   */
  private generateFallbackExplanation(prompt: string): string {
    const isWait = prompt.includes('RECOMMENDED STRATEGY: WAIT');
    const isTwap = prompt.includes('RECOMMENDED STRATEGY: TWAP');
    const isVwap = prompt.includes('RECOMMENDED STRATEGY: VWAP');
    const isIceberg = prompt.includes('RECOMMENDED STRATEGY: ICEBERG');
    const isMarket = prompt.includes('RECOMMENDED STRATEGY: MARKET');

    if (isWait) {
      if (prompt.includes('Spoofing Detected: true')) {
        return 'Execution has been suspended due to an active Spoofing Alert. A large artificial buy/sell wall has been detected in the order book, creating manipulative price pressure. Rest your orders and wait for the spoofing wall to cancel or fill before resuming execution to prevent adverse selection.';
      }
      return 'Execution has been suspended due to extreme Order Flow Toxicity. The VPIN metric is elevated, indicating that informed counterparties represent a dominant share of the order flow. Entering market orders under these conditions is highly likely to suffer adverse selection. Market makers are pulling liquidity, increasing risk.';
    }

    if (isTwap) {
      if (prompt.includes('VPIN is elevated')) {
        return 'We recommend executing using a Time-Weighted Average Price (TWAP) strategy. Although toxicity is elevated, it remains within manageable bounds. Slicing the order into small, equal-sized pieces over a longer time window minimizes immediate impact and helps hide our flow from toxic counterparties.';
      }
      return 'Due to elevated realized volatility, we recommend executing using a Time-Weighted Average Price (TWAP) strategy. Slicing the order over a pre-determined time horizon will help smooth price variance and reduce exposure to sudden short-term price spikes.';
    }

    if (isIceberg) {
      return 'The bid-ask spread is currently wide, suggesting thin liquidity at the touch. We recommend executing via an Iceberg strategy. This will slice the order and display only a small fraction of the size in the public book, preventing the market from front-running our trade and minimizing crossing costs.';
    }

    if (isMarket) {
      return 'Market microstructure parameters are highly favorable. Volatility is minimal, the bid-ask spread is tight, and flow toxicity is low. We recommend using a direct Market Order for immediate execution, taking advantage of current premium liquidity with negligible slippage risk.';
    }

    return 'The market displays standard liquid parameters with balanced toxicity and volatility. We recommend utilizing a Volume-Weighted Average Price (VWAP) strategy to execute inline with the historical volume profile, minimizing market footprint and ensuring execution matches the benchmark.';
  }
}
