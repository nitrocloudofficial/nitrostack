/**
 * Local Feature Embedding Utility
 *
 * Uses @xenova/transformers (all-MiniLM-L6-v2, 384-dim, local)
 * Eagerly initialized during bootstrap so model is warm before any user interaction.
 */

let pipelineExtractor: any = null;
let isInitializing = false;

/**
 * Eagerly initializes the feature extraction pipeline during server startup
 */
export async function initEmbeddingModel(): Promise<void> {
  if (pipelineExtractor || isInitializing) return;
  isInitializing = true;
  console.log('⚡ [Embedding Engine] Eagerly warming up all-MiniLM-L6-v2 transformer model...');
  try {
    const fs = await import('fs');
    if (fs.existsSync('/etc/alpine-release')) {
      throw new Error('Alpine Linux detected, bypassing native onnxruntime-node');
    }
    const { pipeline } = await import('@xenova/transformers');
    pipelineExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ [Embedding Engine] Model ready (384-dim, warm).');
  } catch (err: any) {
    console.warn('⚠️ [Embedding Engine] Transformer unsupported in this environment. Using deterministic fallback.');
  } finally {
    isInitializing = false;
  }
}

/**
 * Generates a 384-dimensional normalized vector embedding for text
 */
export async function embedText(text: string): Promise<number[]> {
  if (!pipelineExtractor) {
    try {
      await initEmbeddingModel();
    } catch (e) {
      // ignore
    }
  }

  if (pipelineExtractor) {
    try {
      const output = await pipelineExtractor(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data) as number[];
    } catch (err) {
      console.warn('Transformer extraction error, using deterministic vector fallback:', err);
    }
  }

  // Fast, deterministic 384-dim normalized fallback vector generator
  return generateDeterministicVector(text, 384);
}

function generateDeterministicVector(text: string, dim = 384): number[] {
  const vec = new Array(dim).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * (i + 1) * 31) % dim;
    vec[idx] += 1.0;
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1.0;
  return vec.map(v => Number((v / norm).toFixed(6)));
}
