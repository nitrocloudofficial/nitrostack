/**
 * video-ingest.tools.ts — MCP Tools for the Video Ingestion Agent (Person 1).
 *
 * Tools exposed:
 *   1. ingest_video         — download audio + transcribe → VideoManifest
 *   2. extract_stock_claim  — parse transcript via Claude → StockClaim
 *   3. list_video_manifests — read video://manifests resource
 *   4. list_video_claims    — read video://claims resource
 *
 * Pipeline sequence the LLM agent should follow:
 *   ingest_video(url) → extract_stock_claim(video_id)
 *   → [Person 2 and Person 3 run in parallel]
 *   → [Person 4 aggregates into final VideoVerdict]
 *
 * All tools write to JSON files under src/data/runtime/ (the blackboard).
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { ingestVideoMetadata, downloadAndTranscribe } from './ingest.impl.js';
import { extractStockClaim }    from './claim-extraction.impl.js';
import { writeManifest, readManifest, readAllManifests }  from './manifests.resource.js';
import { writeClaim, writeRejectedClaim, readAllClaims } from './claims.resource.js';
import { isRejectedClaim }      from './video.types.js';
import * as fs                  from 'fs';
import * as path                from 'path';
import * as os                  from 'os';

export class VideoIngestTools {
  // ─── Tool 1: ingest_video ─────────────────────────────────────────────────
  @Tool({
    name: 'ingest_video',
    description:
      'Video Ingestion Agent (Phase 2, Step 1): Accepts a public video URL from ' +
      'YouTube, X/Twitter, TikTok, or Instagram. Downloads the audio track, ' +
      'transcribes it with OpenAI Whisper, extracts channel metadata, and writes ' +
      'a VideoManifest to the video://manifests resource. ' +
      'Always call this BEFORE extract_stock_claim. ' +
      'Returns the video_id needed by all downstream tools. ' +
      'Requirements: yt-dlp and ffmpeg must be installed; GROQ_API_KEY must be set.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe(
          'Public video URL — YouTube (youtube.com or youtu.be), X/Twitter (x.com or twitter.com), ' +
          'TikTok (tiktok.com), or Instagram (instagram.com). ' +
          'The video must be publicly accessible (not private/age-restricted). ' +
          'Maximum duration: 5 minutes.'
        ),
    }),
  })
  async ingestVideoTool(input: { url: string }, ctx: ExecutionContext) {
    const { url } = input;
    ctx.logger.info('VideoIngest: ingest_video started (metadata only)', { url });

    try {
      // Stage 1 only — metadata fetch (~2-3s). No download, no transcription.
      // extract_stock_claim handles download + transcription in Stage 2.
      const manifest = await ingestVideoMetadata(url);
      writeManifest(manifest);

      ctx.logger.info('VideoIngest: manifest written', {
        videoId:  manifest.video_id,
        platform: manifest.platform,
        channel:  manifest.channel_handle,
        title:    manifest.title,
        duration: manifest.duration_sec,
      });

      return {
        success:      true,
        video_id:     manifest.video_id,
        platform:     manifest.platform,
        title:        manifest.title,
        channel:      manifest.channel_handle,
        duration_sec: manifest.duration_sec,
        next_step:    `Now call extract_stock_claim with video_id: "${manifest.video_id}" — this will download, transcribe, and extract the stock prediction.`,
      };
    } catch (err: any) {
      ctx.logger.error('VideoIngest: ingest_video failed', { url, error: err.message });
      return {
        success: false,
        error:   err.message,
        url,
        hint: 'Ensure the video is public, under 5 minutes, and the URL is correct.',
      };
    }
  }

  // ─── Tool 2: extract_stock_claim ─────────────────────────────────────────
  @Tool({
    name: 'extract_stock_claim',
    description:
      'Video Ingestion Agent (Phase 2, Step 2): Reads a VideoManifest by video_id, ' +
      'sends the transcript to Claude (claude-opus-4-7) to extract the stock prediction, ' +
      'validates the ticker against Alpha Vantage, and writes a StockClaim to ' +
      'video://claims. ' +
      'Returns the structured claim including: ticker, direction (up/down/neutral), ' +
      'timeframe_iso, reason_given, predictor_name, and extraction_confidence. ' +
      'If no stock prediction is found, returns a rejected_reason instead. ' +
      'Requires GROQ_API_KEY. ALPHA_VANTAGE_KEY is recommended for ticker validation.',
    inputSchema: z.object({
      video_id: z
        .string()
        .describe(
          'The video_id returned by ingest_video. ' +
          'A 16-character hex string (SHA-256 of the source URL).'
        ),
    }),
  })
  async extractStockClaimTool(input: { video_id: string }, ctx: ExecutionContext) {
    const { video_id } = input;
    const groqKey = process.env.GROQ_API_KEY ?? '';
    const avKey   = process.env.ALPHA_VANTAGE_KEY ?? '';

    ctx.logger.info('VideoIngest: extract_stock_claim started', { video_id });

    const manifest = readManifest(video_id);
    if (!manifest) {
      return {
        success: false,
        error:   `No manifest found for video_id "${video_id}". Call ingest_video first.`,
      };
    }

    // Stage 2: if transcript is missing (ingest_video only fetched metadata),
    // download audio and transcribe now before extracting the claim.
    if (!manifest.transcript || manifest.transcript.trim().length < 20) {
      ctx.logger.info('VideoIngest: transcript missing — downloading and transcribing now', { video_id });
      try {
        const transcript = await downloadAndTranscribe(manifest.source_url, video_id, groqKey);
        manifest.transcript = transcript;
        writeManifest(manifest);   // update the stored manifest with the transcript
        ctx.logger.info('VideoIngest: transcription complete', { video_id, length: transcript.length });
      } catch (err: any) {
        ctx.logger.error('VideoIngest: transcription failed', { video_id, error: err.message });
        return {
          success: false,
          error:   `Transcription failed: ${err.message}`,
          video_id,
        };
      }
    }

    const result = await extractStockClaim(manifest, groqKey, avKey);

    if (isRejectedClaim(result)) {
      writeRejectedClaim(result);
      ctx.logger.warn('VideoIngest: claim rejected', { video_id, reason: result.rejected_reason });
      return {
        success:         false,
        video_id,
        rejected:        true,
        rejected_reason: result.rejected_reason,
      };
    }

    writeClaim(result);
    ctx.logger.info('VideoIngest: claim written', {
      video_id,
      ticker:    result.ticker,
      direction: result.direction,
      timeframe: result.timeframe_iso,
      confidence: result.extraction_confidence,
    });

    return {
      success: true,
      video_id,
      claim:   result,
      next_steps: [
        `Person 2: call check_calendar_events with ticker="${result.ticker}" and timeframe="${result.timeframe_iso}"`,
        `Person 3: call score_predictor_accuracy with handle="${result.predictor_handle}" and platform="${result.platform}"`,
        `Person 4: call aggregate_video_confidence with video_id="${video_id}" after Persons 2 and 3 complete`,
      ],
    };
  }

  // ─── Tool 3: list_video_manifests ────────────────────────────────────────
  @Tool({
    name: 'list_video_manifests',
    description:
      'Returns all ingested VideoManifests from the video://manifests resource, ' +
      'sorted newest first. Use this to see which videos have been processed ' +
      'and to retrieve their video_ids for downstream tools.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of manifests to return. Defaults to 20.'),
    }),
  })
  async listVideoManifestsTool(input: { limit?: number }, ctx: ExecutionContext) {
    const limit = input.limit ?? 20;
    ctx.logger.info('VideoIngest: list_video_manifests', { limit });

    const manifests = readAllManifests(limit);

    return {
      count:     manifests.length,
      manifests: manifests.map((m) => ({
        video_id:      m.video_id,
        platform:      m.platform,
        title:         m.title,
        channel:       m.channel_handle,
        posted_at:     m.posted_at,
        duration_sec:  m.duration_sec,
        has_transcript: m.transcript.length > 0,
        fetched_at:    m.fetched_at,
      })),
    };
  }

  // ─── Tool 4: list_video_claims ────────────────────────────────────────────
  @Tool({
    name: 'list_video_claims',
    description:
      'Returns all extracted StockClaims from the video://claims resource. ' +
      'Optionally filter by ticker. Use this to review what predictions have ' +
      'been extracted and are ready for signal validation and confidence scoring.',
    inputSchema: z.object({
      ticker: z
        .string()
        .optional()
        .describe(
          'Optional ticker to filter by (e.g. "NVDA"). ' +
          'If omitted, all claims are returned.'
        ),
    }),
  })
  async listVideoClaimsTool(input: { ticker?: string }, ctx: ExecutionContext) {
    const { ticker } = input;
    ctx.logger.info('VideoIngest: list_video_claims', { ticker });

    const claims = readAllClaims(ticker);

    return {
      count:  claims.length,
      claims: claims.map((c) => ({
        video_id:              c.video_id,
        ticker:                c.ticker,
        company_name:          c.company_name,
        direction:             c.direction,
        timeframe_iso:         c.timeframe_iso,
        predictor_handle:      c.predictor_handle,
        platform:              c.platform,
        extraction_confidence: c.extraction_confidence,
      })),
    };
  }

  // ─── Tool 5: check_video_setup ───────────────────────────────────────────
  @Tool({
    name: 'check_video_setup',
    description:
      'Diagnostic tool — checks that all Phase 2 dependencies are correctly configured: ' +
      'GROQ_API_KEY, yt-dlp binary, Groq API connectivity, and writable temp directory. ' +
      'Run this first if ingest_video is failing. No input required.',
    inputSchema: z.object({}),
  })
  async checkVideoSetupTool(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('VideoIngest: check_video_setup');
    const results: Record<string, { ok: boolean; detail: string }> = {};

    // 1. GROQ_API_KEY
    const groqKey = process.env.GROQ_API_KEY ?? '';
    results.groq_api_key = groqKey
      ? { ok: true,  detail: `Set — starts with ${groqKey.slice(0, 10)}...` }
      : { ok: false, detail: 'NOT SET — add GROQ_API_KEY to .env' };

    // 2. ALPHA_VANTAGE_KEY
    const avKey = process.env.ALPHA_VANTAGE_KEY ?? '';
    results.alpha_vantage_key = avKey
      ? { ok: true,  detail: `Set — ${avKey.slice(0, 6)}...` }
      : { ok: false, detail: 'Not set — ticker validation will be skipped' };

    // 3. yt-dlp binary
    try {
      const { default: ytDlp } = await import('yt-dlp-exec' as any);
      const info = await (ytDlp as any)('https://www.youtube.com/watch?v=jNQXAC9IVRw', {
        dumpSingleJson: true, noWarnings: true, skipDownload: true,
      });
      results.yt_dlp = { ok: true, detail: `Working — test fetch: "${info.title}" (${info.duration}s)` };
    } catch (e: any) {
      results.yt_dlp = { ok: false, detail: `FAILED — ${e.message}` };
    }

    // 4. Temp directory writable
    try {
      const testFile = path.join(os.tmpdir(), `mcp-setup-check-${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      results.tmp_dir = { ok: true, detail: os.tmpdir() };
    } catch (e: any) {
      results.tmp_dir = { ok: false, detail: `Not writable — ${e.message}` };
    }

    // 5. Groq API reachable
    if (groqKey) {
      try {
        const { default: OpenAI } = await import('openai');
        const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
        const models = await groq.models.list();
        const hasWhisper = models.data.some((m: any) => m.id.includes('whisper'));
        results.groq_api = { ok: true, detail: `Reachable — ${models.data.length} models, whisper available: ${hasWhisper}` };
      } catch (e: any) {
        results.groq_api = { ok: false, detail: `FAILED — ${e.message}` };
      }
    } else {
      results.groq_api = { ok: false, detail: 'Skipped — GROQ_API_KEY not set' };
    }

    const allOk = Object.values(results).every(r => r.ok);
    return {
      overall: allOk ? 'ALL CHECKS PASSED — ingest_video should work' : 'SOME CHECKS FAILED — see details below',
      checks: results,
    };
  }
}
