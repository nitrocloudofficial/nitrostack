const OPENFDA_BASE_URL = 'https://api.fda.gov';
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Build a fully-qualified openFDA API URL with the API key and query params appended.
 */
export function buildFdaUrl(endpoint: string, query: Record<string, string> = {}): string {
  const url = new URL(`${OPENFDA_BASE_URL}${endpoint}`);
  const apiKey = process.env.OPENFDA_API_KEY;

  if (apiKey) {
    url.searchParams.append('api_key', apiKey);
  }

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.append(key, value);
  }

  return url.toString();
}

/**
 * Fetch data from an openFDA endpoint with graceful 404 handling and in-memory caching.
 * Returns `null` when the API returns 404 (no matching records) instead of throwing.
 */
export async function safeFetchFda<T = unknown>(url: string, retries = 3): Promise<T | null> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) {
    console.error(`[FETCH CACHE HIT] ${url}`);
    return cached.data as T;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const startTime = Date.now();
    try {
      console.error(`[FETCH START] (Attempt ${attempt}/${retries}) ${url}`);
      const response = await fetch(url);
      const latency = Date.now() - startTime;
      console.error(`[FETCH RESPONSE] Endpoint: ${url} | Status: ${response.status} ${response.statusText} | Latency: ${latency}ms`);

      if (response.status === 404) {
        console.error(`[FETCH 404] Endpoint: ${url}`);
        return null;
      }

      if (!response.ok) {
        if ([429, 500, 502, 503, 504].includes(response.status) && attempt < retries) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s...
          console.error(`[FETCH RETRY] Endpoint: ${url} | Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        const errorText = await response.text();
        console.error(`[FETCH ERROR BODY] Endpoint: ${url} | Status: ${response.status} | Body: ${errorText}`);
        throw new Error(`openFDA API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
      return data as T;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      console.error(`[FETCH EXCEPTION] Endpoint: ${url} | Latency: ${latency}ms | Error: ${error.message}`);
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 500;
        console.error(`[FETCH RETRY] Endpoint: ${url} | Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return null;
}