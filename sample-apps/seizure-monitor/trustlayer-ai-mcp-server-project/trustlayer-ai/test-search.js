async function searchWeb(query) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const snippets = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g) || [];
    const cleaned = snippets.map(s => s.replace(/<[^>]+>/g, '').trim()).slice(0, 4).join('\n');
    console.log("Result:", cleaned || 'No results found on the web.');
  } catch (e) {
    console.error("Error", e);
  }
}
searchWeb("MacBook Air M2 used price in India");
