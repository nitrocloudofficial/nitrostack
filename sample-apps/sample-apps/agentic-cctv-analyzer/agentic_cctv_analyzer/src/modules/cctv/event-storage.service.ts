import { Injectable } from '@nitrostack/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ClipRecord } from './clip-generation.service.js';
import type { TimelineResult } from './timeline.service.js';
import type { VideoSummary } from './video-summary.service.js';
import { DetectionEvent } from './yolo-detection.service.js';

export interface StoredAnalysisRecord {
    [key: string]: any;
    videoId: string;
    filename: string;
    analyzedAt: string;
    metadata: Record<string, any>;
    extractedFrames: string[];
    events: DetectionEvent[];
    timeline?: TimelineResult;
    clips?: ClipRecord[];
    videoSummary?: VideoSummary;
    cameraId?: string;
    location?: string;
    summary?: string;
    tags?: string[];
}

@Injectable()
export class EventStorageService {
    private readonly storageFile: string;
    private records: Map<string, StoredAnalysisRecord> = new Map();

    constructor() {
        const dataDir = join(process.cwd(), 'data');
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }
        this.storageFile = join(dataDir, 'event_records.json');
        this.loadFromDisk();
    }

    /**
     * Save analysis record (Designed to be swapped with SQLite later)
     */
    async saveAnalysis(record: StoredAnalysisRecord): Promise<void> {
        this.records.set(record.videoId, record);
        this.persistToDisk();
    }

    /**
     * Get stored analysis record by videoId
     */
    async getAnalysis(videoId: string): Promise<StoredAnalysisRecord | null> {
        return this.records.get(videoId) || null;
    }

    /**
     * Get all detected events for a specific videoId
     */
    async getEventsForVideo(videoId: string): Promise<DetectionEvent[]> {
        const record = this.records.get(videoId);
        return record ? record.events : [];
    }

    async getEventById(eventId: string): Promise<DetectionEvent | null> {
        for (const record of this.records.values()) {
            const event = record.events.find((evt) => evt.id === eventId);
            if (event) {
                return event;
            }
        }
        return null;
    }

    async saveClip(clip: ClipRecord): Promise<void> {
        const record = this.records.get(clip.videoId);
        if (!record) {
            throw new Error(`Cannot save clip. Video not found for videoId "${clip.videoId}".`);
        }

        record.clips = record.clips || [];
        const existingIndex = record.clips.findIndex((existing) => existing.eventId === clip.eventId);
        if (existingIndex >= 0) {
            record.clips[existingIndex] = { ...record.clips[existingIndex], ...clip };
        } else {
            record.clips.push(clip);
        }

        this.records.set(clip.videoId, record);
        this.persistToDisk();
    }

    async getClip(clipId: string): Promise<ClipRecord | null> {
        for (const record of this.records.values()) {
            const clip = record.clips?.find((item) => item.clipId === clipId);
            if (clip) {
                return clip;
            }
        }
        return null;
    }

    async getClipForEvent(eventId: string): Promise<ClipRecord | null> {
        for (const record of this.records.values()) {
            const clip = record.clips?.find((item) => item.eventId === eventId);
            if (clip) {
                return clip;
            }
        }
        return null;
    }

    async listClips(videoId: string): Promise<ClipRecord[]> {
        const record = this.records.get(videoId);
        return record?.clips ?? [];
    }

    async saveSummary(videoId: string, summary: VideoSummary): Promise<void> {
        const record = this.records.get(videoId);
        if (!record) {
            throw new Error(`Cannot save summary. Video not found for videoId "${videoId}".`);
        }

        record.videoSummary = summary;
        this.records.set(videoId, record);
        this.persistToDisk();
    }

    async getSummary(videoId: string): Promise<VideoSummary | null> {
        const record = this.records.get(videoId);
        return record?.videoSummary ?? null;
    }

    async getTimelineForVideo(videoId: string): Promise<TimelineResult | null> {
        const record = this.records.get(videoId);
        return record?.timeline || null;
    }

    /**
     * Search stored events across all analyzed videos by keyword (natural language / object search)
     */
    async searchStoredEvents(keyword?: string): Promise<DetectionEvent[]> {
        const allEvents: DetectionEvent[] = [];
        for (const record of this.records.values()) {
            allEvents.push(...(record.events || []));
        }

        if (!keyword) {
            return allEvents;
        }

        const lower = keyword.toLowerCase();
        return allEvents.filter((evt) => {
            const matchesLabel = evt.label?.toLowerCase().includes(lower);
            const matchesClass = evt.objectClass?.toLowerCase().includes(lower);
            const matchesAction = evt.action?.toLowerCase().includes(lower);
            const matchesDesc = evt.description?.toLowerCase().includes(lower);
            const matchesTags = evt.tags?.some((t) => t.toLowerCase().includes(lower));
            return matchesLabel || matchesClass || matchesAction || matchesDesc || matchesTags;
        });
    }

    /**
     * List all stored analysis records
     */
    async listAnalyses(): Promise<StoredAnalysisRecord[]> {
        return Array.from(this.records.values());
    }

    private loadFromDisk(): void {
        try {
            if (existsSync(this.storageFile)) {
                const rawData = readFileSync(this.storageFile, 'utf8');
                const list = JSON.parse(rawData) as StoredAnalysisRecord[];
                for (const item of list) {
                    this.records.set(item.videoId, item);
                }
            }
        } catch {
            this.records.clear();
        }
    }

    private persistToDisk(): void {
        try {
            const list = Array.from(this.records.values());
            writeFileSync(this.storageFile, JSON.stringify(list, null, 2), 'utf8');
        } catch {
            // Handle disk write error silently
        }
    }
}
