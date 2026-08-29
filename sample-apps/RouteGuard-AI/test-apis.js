/**
 * Direct API key verification test
 * Tests NewsAPI and OpenWeather independently
 */
import 'dotenv/config';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;

console.log('\n🔑 Testing API Keys\n');
console.log(`  NewsAPI key:      ${NEWSAPI_KEY?.slice(0,8)}...`);
console.log(`  OpenWeather key:  ${OPENWEATHER_KEY?.slice(0,8)}...\n`);

// ── Test 1: NewsAPI ────────────────────────────────────────────────────────────
console.log('📰 Testing NewsAPI...');
try {
  const url = `https://newsapi.org/v2/everything?q=supply+chain+disruption+shipping&sortBy=publishedAt&language=en&pageSize=5&apiKey=${NEWSAPI_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'ok') {
    console.log(`  ✅ NewsAPI LIVE — ${data.totalResults} total articles found`);
    console.log(`  Latest headlines:`);
    data.articles.slice(0, 3).forEach((a, i) => {
      console.log(`    ${i+1}. [${a.source.name}] ${a.title.slice(0, 80)}...`);
      console.log(`       Published: ${new Date(a.publishedAt).toLocaleString()}`);
    });
  } else {
    console.log(`  ❌ NewsAPI error: ${data.message || data.code}`);
  }
} catch (e) {
  console.log(`  ❌ NewsAPI fetch failed: ${e.message}`);
}

// ── Test 2: OpenWeather ────────────────────────────────────────────────────────
console.log('\n🌤️  Testing OpenWeather (Shanghai port)...');
try {
  // Use current weather endpoint (free tier, no subscription needed)
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=31.23&lon=121.47&appid=${OPENWEATHER_KEY}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  if (res.ok && data.name) {
    console.log(`  ✅ OpenWeather LIVE — ${data.name}, ${data.sys.country}`);
    console.log(`  Current conditions:`);
    console.log(`    Weather: ${data.weather[0].description}`);
    console.log(`    Temp: ${data.main.temp}°C  |  Wind: ${data.wind.speed} m/s`);
    console.log(`    Humidity: ${data.main.humidity}%  |  Pressure: ${data.main.pressure} hPa`);
  } else {
    console.log(`  ❌ OpenWeather error: ${data.message || JSON.stringify(data)}`);
    console.log(`     Note: New keys take 2-3 hours to activate on free tier`);
  }
} catch (e) {
  console.log(`  ❌ OpenWeather fetch failed: ${e.message}`);
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log('\n📋 Summary');
console.log('  - MCP server uses NewsAPI for news-based threat detection');
console.log('  - MCP server uses OpenWeather for port weather alerts');
console.log('  - If OpenWeather key is new, wait 2-3 hours for activation');
console.log('  - Even with demo/fallback data, all 4 MCP tools work fully\n');
