import fs from 'fs';

async function searchWeb(query) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const snippets = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g) || [];
    const cleaned = snippets.map(s => s.replace(/<[^>]+>/g, '').trim()).slice(0, 4).join('\n');
    
    // Extract prices
    const priceRegex = /(?:₹|Rs\.?)\s*([\d,]+)/gi;
    const matches = [...cleaned.matchAll(priceRegex)];
    const prices = matches.map(m => parseInt(m[1].replace(/,/g, ''), 10)).filter(p => p > 1000 && p < 1000000);
    
    fs.writeFileSync('search-output.txt', `Cleaned:\n${cleaned}\n\nPrices: ${JSON.stringify(prices)}`);
  } catch (e) {
    fs.writeFileSync('search-output.txt', `Error: ${e.message}`);
  }
}
searchWeb("MacBook Air M2 used price India");
