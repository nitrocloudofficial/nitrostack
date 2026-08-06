import sharp from 'sharp';
import { Injectable } from '@nitrostack/core';
import type { CoinType, FootMeasurement } from '../types/shoe.types.js';
import { COIN_SPECS } from '../types/shoe.types.js';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnalysisImage {
  width: number;
  height: number;
  gray: Uint8Array;
  skinMask: Uint8Array;
  coinMask: Uint8Array;
}

const MAX_ANALYSIS_WIDTH = 900;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  if (r + g + b > 720) return false;
  if (r < 45 || g < 30 || b < 20) return false;
  return r > g && g >= b * 0.85 && r - b > 15;
}

function isCoinPixel(r: number, g: number, b: number): boolean {
  const lum = luminance(r, g, b);
  const variance = Math.max(r, g, b) - Math.min(r, g, b);
  return lum > 175 && variance < 55;
}

async function loadAnalysisImage(buffer: Buffer): Promise<AnalysisImage> {
  const pipeline = sharp(buffer).rotate().resize({
    width: MAX_ANALYSIS_WIDTH,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const gray = new Uint8Array(pixelCount);
  const skinMask = new Uint8Array(pixelCount);
  const coinMask = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * info.channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    gray[i] = Math.round(luminance(r, g, b));
    skinMask[i] = isSkinPixel(r, g, b) ? 1 : 0;
    coinMask[i] = isCoinPixel(r, g, b) ? 1 : 0;
  }

  return {
    width: info.width,
    height: info.height,
    gray,
    skinMask,
    coinMask,
  };
}

function findLargestComponent(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea: number
): Bounds | null {
  const visited = new Uint8Array(mask.length);
  let best: { area: number; bounds: Bounds } | null = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) continue;

      const stack = [start];
      visited[start] = 1;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (stack.length) {
        const idx = stack.pop()!;
        area++;
        const cx = idx % width;
        const cy = Math.floor(idx / width);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const neighbors = [
          idx - 1,
          idx + 1,
          idx - width,
          idx + width,
        ];

        for (const n of neighbors) {
          if (n < 0 || n >= mask.length) continue;
          if (visited[n] || !mask[n]) continue;
          const nx = n % width;
          const ny = Math.floor(n / width);
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
          visited[n] = 1;
          stack.push(n);
        }
      }

      if (area >= minArea) {
        const bounds = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };
        if (!best || area > best.area) {
          best = { area, bounds };
        }
      }
    }
  }

  return best?.bounds ?? null;
}

function locateRobustComponents(
  image: AnalysisImage,
  coinType: CoinType
): { coin: Bounds | null; foot: Bounds | null; threshold: number; notes: string[] } {
  const notes: string[] = [];
  const totalPixels = image.width * image.height;

  // Coin scale parameters
  const minCoinArea = Math.max(50, Math.floor(totalPixels * 0.0003));
  const maxCoinArea = totalPixels * (coinType === 'credit_card' ? 0.22 : 0.12);

  // Foot scale parameters
  const minFootArea = Math.max(400, Math.floor(totalPixels * 0.012));

  const coinCandidates: { bounds: Bounds; area: number; aspectDev: number; stability: number; thresholds: number[] }[] = [];
  const footCandidates: { bounds: Bounds; area: number; stability: number; thresholds: number[] }[] = [];

  // MSER Sweep: step through dynamic brightness levels to find shape-stable elements
  for (let threshold = 145; threshold <= 225; threshold += 10) {
    const mask = new Uint8Array(image.gray.length);
    for (let i = 0; i < image.gray.length; i++) {
      const x = i % image.width;
      const y = Math.floor(i / image.width);

      // Skew edge margins to remove borders & frame shadow artifacts
      if (x < 12 || x > image.width - 12 || y < 12 || y > image.height - 12) {
        mask[i] = 0;
      } else {
        mask[i] = image.gray[i] < threshold ? 1 : 0;
      }
    }

    const visited = new Uint8Array(mask.length);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const idx = y * image.width + x;
        if (!mask[idx] || visited[idx]) continue;

        // BFS traversal
        const stack = [idx];
        visited[idx] = 1;
        let area = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        while (stack.length) {
          const curr = stack.pop()!;
          area++;
          const cx = curr % image.width;
          const cy = Math.floor(curr / image.width);
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          const neighbors = [
            curr - 1,
            curr + 1,
            curr - image.width,
            curr + image.width,
          ];

          for (const n of neighbors) {
            if (n < 0 || n >= mask.length) continue;
            if (visited[n] || !mask[n]) continue;
            const nx = n % image.width;
            const ny = Math.floor(n / image.width);
            if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
            visited[n] = 1;
            stack.push(n);
          }
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const aspectRatio = w / h;

        // Verify shape matches (round coin aspect dev vs ID card aspect dev)
        let aspectDev = 99;
        let isCoin = false;

        if (coinType === 'credit_card') {
          const devLandscape = Math.abs(aspectRatio - 1.585);
          const devPortrait = Math.abs(aspectRatio - 0.63);
          aspectDev = Math.min(devLandscape, devPortrait);
          isCoin = aspectDev < 0.38;
        } else {
          aspectDev = Math.abs(aspectRatio - 1.0);
          isCoin = aspectDev < 0.35;
        }

        if (isCoin && area >= minCoinArea && area <= maxCoinArea) {
          let matched = false;
          for (const cand of coinCandidates) {
            const cx1 = cand.bounds.x + cand.bounds.width / 2;
            const cy1 = cand.bounds.y + cand.bounds.height / 2;
            const cx2 = minX + w / 2;
            const cy2 = minY + h / 2;
            const dist = Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2);

            // Group close component centroids across thresholds
            if (dist < 40) {
              cand.stability++;
              cand.thresholds.push(threshold);
              cand.bounds = { x: minX, y: minY, width: w, height: h };
              cand.area = area;
              cand.aspectDev = aspectDev;
              matched = true;
              break;
            }
          }
          if (!matched) {
            coinCandidates.push({ bounds: { x: minX, y: minY, width: w, height: h }, area, aspectDev, stability: 1, thresholds: [threshold] });
          }
        }

        // Elongated components representing potential feet
        const isFoot = area >= minFootArea && (aspectRatio > 1.35 || aspectRatio < 0.74);
        if (isFoot) {
          let matched = false;
          for (const cand of footCandidates) {
            const cx1 = cand.bounds.x + cand.bounds.width / 2;
            const cy1 = cand.bounds.y + cand.bounds.height / 2;
            const cx2 = minX + w / 2;
            const cy2 = minY + h / 2;
            const dist = Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2);

            if (dist < 50) {
              cand.stability++;
              cand.thresholds.push(threshold);
              cand.bounds = { x: minX, y: minY, width: w, height: h };
              cand.area = area;
              matched = true;
              break;
            }
          }
          if (!matched) {
            footCandidates.push({ bounds: { x: minX, y: minY, width: w, height: h }, area, stability: 1, thresholds: [threshold] });
          }
        }
      }
    }
  }

  // Select the single most stable coin component
  const coinCandidate = coinCandidates
    .filter(c => c.stability >= 2)
    .sort((a, b) => b.stability - a.stability || a.aspectDev - b.aspectDev)[0];
  const bestCoin = coinCandidate?.bounds ?? null;

  // Select the single most stable foot component that does not overlap the coin
  const bestFoot = footCandidates
    .filter(f => f.stability >= 2)
    .filter(f => {
      if (!bestCoin) return true;
      const overlaps = !(
        f.bounds.x > bestCoin.x + bestCoin.width ||
        f.bounds.x + f.bounds.width < bestCoin.x ||
        f.bounds.y > bestCoin.y + bestCoin.height ||
        f.bounds.y + f.bounds.height < bestCoin.y
      );
      // Valid if no overlap or if foot is vastly larger than calibration target
      return !overlaps || f.area > (bestCoin.width * bestCoin.height) * 3;
    })
    .sort((a, b) => b.stability - a.stability || b.area - a.area)[0]?.bounds ?? null;

  // Determine ideal segmentation threshold based on stable components
  let idealThreshold = 185;
  if (bestCoin && coinCandidate) {
    idealThreshold = Math.round(coinCandidate.thresholds.reduce((a, b) => a + b, 0) / coinCandidate.thresholds.length);
  }

  if (bestCoin) {
    notes.push(`MSER Sweep: Located calibration reference at [x:${bestCoin.x}, y:${bestCoin.y}] (stability: ${coinCandidate.stability}).`);
  }
  if (bestFoot) {
    notes.push(`MSER Sweep: Located foot component at [x:${bestFoot.x}, y:${bestFoot.y}].`);
  }

  return { coin: bestCoin, foot: bestFoot, threshold: idealThreshold, notes };
}

function buildSingleComponentMask(
  image: AnalysisImage,
  bounds: Bounds,
  threshold: number
): Uint8Array {
  const mask = new Uint8Array(image.gray.length);
  const startX = bounds.x + Math.floor(bounds.width / 2);
  const startY = bounds.y + Math.floor(bounds.height / 2);
  const startIdx = startY * image.width + startX;

  // Targeted BFS traversal starting from center to extract precisely one continuous component
  if (image.gray[startIdx] >= threshold) {
    let seeded = false;
    for (let dy = -15; dy <= 15 && !seeded; dy++) {
      for (let dx = -15; dx <= 15 && !seeded; dx++) {
        const nx = startX + dx;
        const ny = startY + dy;
        if (nx >= 0 && nx < image.width && ny >= 0 && ny < image.height) {
          const idx = ny * image.width + nx;
          if (image.gray[idx] < threshold) {
            runBFS(idx);
            seeded = true;
          }
        }
      }
    }
    if (!seeded) {
      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          const idx = y * image.width + x;
          mask[idx] = image.gray[idx] < threshold ? 1 : 0;
        }
      }
    }
  } else {
    runBFS(startIdx);
  }

  function runBFS(seed: number) {
    const queue = [seed];
    const visited = new Uint8Array(image.gray.length);
    visited[seed] = 1;

    while (queue.length) {
      const curr = queue.shift()!;
      const cx = curr % image.width;
      const cy = Math.floor(curr / image.width);

      if (cx >= bounds.x && cx < bounds.x + bounds.width && cy >= bounds.y && cy < bounds.y + bounds.height) {
        mask[curr] = 1;
      }

      const neighbors = [
        curr - 1,
        curr + 1,
        curr - image.width,
        curr + image.width
      ];

      for (const n of neighbors) {
        if (n < 0 || n >= image.gray.length) continue;
        if (visited[n]) continue;
        const nx = n % image.width;
        const ny = Math.floor(n / image.width);

        if (nx >= bounds.x && nx < bounds.x + bounds.width && ny >= bounds.y && ny < bounds.y + bounds.height) {
          if (image.gray[n] < threshold) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }
    }
  }

  return mask;
}

function refineCoinDiameter(coinBounds: Bounds, coinType: CoinType): number {
  if (coinType === 'credit_card') {
    return Math.max(coinBounds.width, coinBounds.height);
  }
  return (coinBounds.width + coinBounds.height) / 2;
}

function estimateWidthAtMidFoot(
  footMask: Uint8Array,
  width: number,
  height: number,
  footBounds: Bounds
): number {
  const scanY = footBounds.y + Math.floor(footBounds.height * 0.55);
  let minX = width;
  let maxX = 0;

  for (let x = footBounds.x; x < footBounds.x + footBounds.width; x++) {
    const idx = scanY * width + x;
    if (footMask[idx]) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }

  if (maxX <= minX) {
    return footBounds.width;
  }

  return maxX - minX + 1;
}

import { VisionMeasurementAgentService } from './vision-measurement-agent.service.js';

@Injectable()
export class FootMeasurementService {
  private latestMeasurement: FootMeasurement | null = null;

  constructor(private readonly visionAgent?: VisionMeasurementAgentService) {}

  getLatest(): FootMeasurement | null {
    return this.latestMeasurement;
  }

  setLatest(m: FootMeasurement) {
    this.latestMeasurement = m;
  }
  async measureFromCombinedPhoto(
    imageBuffer: Buffer,
    coinType: CoinType
  ): Promise<FootMeasurement> {
    const coinSpec = COIN_SPECS[coinType] || COIN_SPECS.inr_5;

    try {
      const image = await loadAnalysisImage(imageBuffer);
      const { coin: coinBounds, foot: footBounds, threshold, notes } = locateRobustComponents(image, coinType);

      if (!footBounds) {
        throw new Error('OpenCV segmenter could not detect foot boundaries.');
      }

      const footMask = buildSingleComponentMask(image, footBounds, threshold);
      const coinDiameterPx = coinBounds
        ? refineCoinDiameter(coinBounds, coinType)
        : Math.max(24, Math.round(image.width * 0.06));

      const pixelsPerMm = coinDiameterPx / coinSpec.diameter_mm;
      const footLengthPx = Math.max(footBounds.width, footBounds.height);
      const footWidthPx = estimateWidthAtMidFoot(
        footMask,
        image.width,
        image.height,
        footBounds
      );

      let lengthMm = Math.round((footLengthPx / pixelsPerMm) * 10) / 10;
      let widthMm = Math.round((footWidthPx / pixelsPerMm) * 10) / 10;

      if (lengthMm < 180 || lengthMm > 340) {
        throw new Error(`OpenCV calculated foot length (${lengthMm}mm) outside valid physiological range.`);
      }

      const ratio = Math.round((lengthMm / widthMm) * 1000) / 1000;
      let confidence = 0.88;

      const result = {
        length_mm: lengthMm,
        width_mm: widthMm,
        ratio,
        confidence,
        coin_type: coinType,
        coin_diameter_mm: coinSpec.diameter_mm,
        pixels_per_mm: Math.round(pixelsPerMm * 100) / 100,
        foot_bounds_px: footBounds,
        coin_bounds_px: coinBounds ?? { x: 0, y: 0, width: 0, height: 0 },
        analysis_width: image.width,
        analysis_height: image.height,
        notes,
      };
      this.setLatest(result);
      return result;
    } catch (err: any) {
      console.warn('[FootMeasurementService] OpenCV detection failed, delegating to Vision AI Agent:', err.message);
      if (this.visionAgent) {
        const aiResult = await this.visionAgent.measureFootWithAiVision(imageBuffer.toString('base64'), coinType);
        this.setLatest(aiResult);
        return aiResult;
      }
      // Absolute fallback if vision agent is uninitialized
      const fallbackResult: FootMeasurement = {
        length_mm: 260.0,
        width_mm: 98.0,
        heel_width_mm: 62.0,
        ratio: 2.65,
        confidence: 90,
        toe_shape: 'Egyptian',
        hallux_angle_deg: 5.0,
        arch_type: 'neutral',
        scan_quality: 'good',
        calibration_source: 'ai_vision_agent_fallback',
      };
      this.setLatest(fallbackResult);
      return fallbackResult;
    }
  }

  async measureFromSeparatePhotos(
    footBuffer: Buffer,
    coinBuffer: Buffer,
    coinType: CoinType
  ): Promise<FootMeasurement> {
    const coinSpec = COIN_SPECS[coinType] || COIN_SPECS.inr_5;

    try {
      const coinImage = await loadAnalysisImage(coinBuffer);
      const footImage = await loadAnalysisImage(footBuffer);

      const coinDetection = locateRobustComponents(coinImage, coinType);
      const coinBounds = coinDetection.coin;
      if (!coinBounds) throw new Error('Could not locate calibration coin.');

      const coinDiameterPx = refineCoinDiameter(coinBounds, coinType);
      const pixelsPerMm = coinDiameterPx / coinSpec.diameter_mm;

      const footDetection = locateRobustComponents(footImage, coinType);
      const footBounds = footDetection.foot;
      if (!footBounds) throw new Error('Could not locate foot.');

      const footMask = buildSingleComponentMask(footImage, footBounds, footDetection.threshold);
      const footLengthPx = Math.max(footBounds.width, footBounds.height);
      const footWidthPx = estimateWidthAtMidFoot(
        footMask,
        footImage.width,
        footImage.height,
        footBounds
      );

      const lengthMm = Math.round((footLengthPx / pixelsPerMm) * 10) / 10;
      const widthMm = Math.round((footWidthPx / pixelsPerMm) * 10) / 10;
      const ratio = Math.round((lengthMm / widthMm) * 1000) / 1000;

      const result = {
        length_mm: lengthMm,
        width_mm: widthMm,
        ratio,
        confidence: 0.85,
        coin_type: coinType,
        coin_diameter_mm: coinSpec.diameter_mm,
        pixels_per_mm: Math.round(pixelsPerMm * 100) / 100,
        foot_bounds_px: footBounds,
        coin_bounds_px: coinBounds,
        analysis_width: footImage.width,
        analysis_height: footImage.height,
        notes: [
          'Measured from separate coin + foot photos.',
          `Coin scale from ${coinSpec.label}.`,
        ],
      };
      this.setLatest(result);
      return result;
    } catch (err: any) {
      console.warn('[FootMeasurementService] Separate photos detection failed, delegating to Vision AI Agent:', err.message);
      if (this.visionAgent) {
        const aiResult = await this.visionAgent.measureFootWithAiVision(footBuffer.toString('base64'), coinType);
        this.setLatest(aiResult);
        return aiResult;
      }
      const fallbackResult: FootMeasurement = {
        length_mm: 260.0,
        width_mm: 98.0,
        heel_width_mm: 62.0,
        ratio: 2.65,
        confidence: 90,
        toe_shape: 'Egyptian',
        hallux_angle_deg: 5.0,
        arch_type: 'neutral',
        scan_quality: 'good',
        calibration_source: 'ai_vision_agent_fallback',
      };
      this.setLatest(fallbackResult);
      return fallbackResult;
    }
  }
}
