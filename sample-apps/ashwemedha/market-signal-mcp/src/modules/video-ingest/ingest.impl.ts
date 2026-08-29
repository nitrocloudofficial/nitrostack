/**
 * ingest.impl.ts — Video metadata + audio download + Groq Whisper transcription.
 *
 * Split into two stages to avoid NitroStudio's ~30s tool timeout:
 *   Stage 1 (ingest_video):       metadata fetch only — returns in ~2-3s
 *   Stage 2 (extract_stock_claim): download + transcribe + extract — ~15-25s
 *
 * yt-dlp is bundled via yt-dlp-exec. ffmpeg is NOT required — native m4a/webm formats.
 */
import { createHash }  from 'crypto';
import * as fs         from 'fs';
import * as path       from 'path';
import * as os         from 'os';
// yt-dlp-exec is optional — loaded dynamically at runtime
import OpenAI          from 'openai';
import type { VideoManifest, VideoPlatform } from './video.types.js';

const PREFERRED_FORMATS = ['m4a', 'webm', 'mp4', 'mp3', 'wav', 'ogg'];

export function makeVideoId(url: string): string {
  return createHash('sha256').update(url.trim()).digest('hex').slice(0, 16);
}

export function detectPlatform(url: string): VideoPlatform {
  if (/youtube\.com|youtu\.be/i.test(url))    return 'youtube';
  if (/twitter\.com|x\.com|t\.co/i.test(url)) return 'twitter';
  if (/tiktok\.com/i.test(url))               return 'tiktok';
  if (/instagram\.com/i.test(url))            return 'instagram';
  return 'other';
}

interface YtDlpInfo {
  title?:       string;
  uploader?:    string;
  uploader_id?: string;
  channel?:     string;
  channel_id?:  string;
  upload_date?: string;
  duration?:    number;
  [key: string]: unknown;
}

export async function fetchVideoMetadata(url: string): Promise<YtDlpInfo> {
  try {
    const { default: ytDlp } = await import('yt-dlp-exec' as any);
    return await (ytDlp as any)(url, {
      dumpSingleJson:     true,
      noWarnings:         true,
      noCheckCertificate: true,
      skipDownload:       true,
    }) as unknown as YtDlpInfo;
  } catch (err: any) {
    throw new Error(`yt-dlp metadata fetch failed: ${err.message ?? err}`);
  }
}

export async function downloadAudio(url: string, videoId: string): Promise<string> {
  const tmpDir   = os.tmpdir();
  const prefix   = `mcp-${videoId}`;
  const template = path.join(tmpDir, `${prefix}.%(ext)s`);

  for (const ext of PREFERRED_FORMATS) {
    const p = path.join(tmpDir, `${prefix}.${ext}`);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* noop */ }
  }

  try {
    const { default: ytDlp } = await import('yt-dlp-exec' as any);
    await (ytDlp as any)(url, {
      format:             'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio[ext=mp4]/bestaudio',
      output:             template,
      noWarnings:         true,
      noCheckCertificate: true,
      maxFilesize:        '50m',
    });
  } catch (err: any) {
    throw new Error(`Audio download failed: ${err.message ?? err}`);
  }

  for (const ext of PREFERRED_FORMATS) {
    const p = path.join(tmpDir, `${prefix}.${ext}`);
    if (fs.existsSync(p)) return p;
  }

  const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
  if (files.length > 0) return path.join(tmpDir, files[0]);

  throw new Error('Audio file not found after download.');
}

export async function transcribeAudio(audioPath: string, groqKey: string): Promise<string> {
  const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
  const result = await groq.audio.transcriptions.create({
    file:            fs.createReadStream(audioPath),
    model:           'whisper-large-v3-turbo',
    response_format: 'json',
  });
  return result.text;
}

/**
 * Stage 1 — metadata only. Returns in ~2-3s regardless of video length.
 * transcript is intentionally empty here — filled by downloadAndTranscribe().
 */
export async function ingestVideoMetadata(url: string): Promise<VideoManifest & { transcript_error?: string }> {
  const videoId   = makeVideoId(url);
  const platform  = detectPlatform(url);
  const fetchedAt = new Date().toISOString();

  let metadata: YtDlpInfo;
  try {
    metadata = await fetchVideoMetadata(url);
  } catch (err: any) {
    throw new Error(`[ingest_video] ${err.message}`);
  }

  const durationSec = metadata.duration;
  if (durationSec && durationSec > 300) {
    throw new Error(
      `Video is ${Math.round(durationSec / 60)} min long. Maximum is 5 minutes to keep transcription fast.`
    );
  }

  const rawHandle     = metadata.uploader_id ?? metadata.channel_id ?? '';
  const channelHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : undefined;
  const postedAt      = metadata.upload_date
    ? `${metadata.upload_date.slice(0,4)}-${metadata.upload_date.slice(4,6)}-${metadata.upload_date.slice(6,8)}T00:00:00Z`
    : undefined;

  return {
    video_id:       videoId,
    source_url:     url,
    platform,
    title:          metadata.title,
    channel_name:   metadata.uploader ?? metadata.channel,
    channel_handle: channelHandle,
    channel_id:     metadata.channel_id ?? metadata.uploader_id,
    posted_at:      postedAt,
    duration_sec:   durationSec,
    transcript:     '',   // filled by Stage 2
    fetched_at:     fetchedAt,
  };
}

/**
 * Stage 2 — download audio + transcribe. Called by extract_stock_claim when transcript is missing.
 * Returns the transcript string, or throws on failure.
 */
export async function downloadAndTranscribe(url: string, videoId: string, groqKey: string): Promise<string> {
  if (!groqKey) throw new Error('GROQ_API_KEY not set — cannot transcribe.');

  let audioPath: string | undefined;
  try {
    audioPath = await downloadAudio(url, videoId);
    const transcript = await transcribeAudio(audioPath, groqKey);
    return transcript;
  } finally {
    if (audioPath) {
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch { /* noop */ }
    }
  }
}
