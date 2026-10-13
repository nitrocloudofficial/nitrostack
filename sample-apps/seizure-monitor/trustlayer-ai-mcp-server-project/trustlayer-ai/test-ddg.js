import fs from 'fs';

async function searchWeb(query) {
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

async function test() {
  const query = "Realme used price India";
  const searchResultText = await searchWeb(query);
  console.log("Search Result Text:", searchResultText);
  
  const priceRegex = /(?:₹|Rs\.?)\s*([\d,]+)/gi;
  const matches = [...searchResultText.matchAll(priceRegex)];
  const prices = matches
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(p => p > 1000 && p < 1000000);
  
  console.log("Extracted Prices:", prices);
}

test();
