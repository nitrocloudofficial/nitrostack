import 'dotenv/config';

/**
 * Generate 1536-dimensional embedding vector for text
 * Fast, deterministic unit vector generator (1536 dims) for sub-second database indexing
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const vector = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vector[i % 1536] += (code / 255.0);
    vector[(i * 31) % 1536] += 0.05;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1.0;
  return vector.map(val => val / norm);
}

/**
 * Format array of numbers into Postgres vector string syntax '[0.1,0.2,...]'
 */
export function formatPgVector(arr: number[]): string {
  return `[${arr.join(',')}]`;
}
