import { Injectable } from '@nitrostack/core';
import { EventStorageService } from './event-storage.service.js';
import type { DetectionEvent } from './yolo-detection.service.js';

export interface ClipRecord {
    clipId: string;
    videoId: string;
    eventId: string;
    segmentStart: number;
    segmentEnd: number;
    clipTitle: string;
    clipDescription: string;
    generatedAt: string;
    clipUrl: string;
}

@Injectable({ deps: [EventStorageService] })
export class ClipGenerationService {
    constructor(private readonly eventStorageService: EventStorageService) {}

    private buildTitle(event: DetectionEvent): string {
        const objectClass = event.objectClass ? event.objectClass.trim() : 'Event';
        return `${this.capitalize(objectClass)} Detection`;
    }

    private buildDescription(event: DetectionEvent): string {
        const objectClass = event.objectClass ? event.objectClass.trim() : 'object';
        const action = event.action ? event.action.replace(/_/g, ' ').trim() : 'detected';
        const location = event.location ? ` near ${event.location}` : '';
        return `Detected ${objectClass} ${action}${location}.`;
    }

    private capitalize(value: string): string {
        if (!value) {
            return '';
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    private normalizeClipId(eventId: string): string {
        const sanitized = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `clip_${sanitized}`;
    }

    async generateClip(eventId: string): Promise<ClipRecord> {
        if (!eventId) {
            throw new Error('eventId is required to generate a clip');
        }

        const existingClip = await this.eventStorageService.getClipForEvent(eventId);
        if (existingClip) {
            return existingClip;
        }

        const event = await this.eventStorageService.getEventById(eventId);
        if (!event) {
            throw new Error(`Invalid eventId: ${eventId}. No matching detection event was found.`);
        }

        const segmentStart = Math.max(0, event.timestamp - 5);
        const segmentEnd = event.timestamp + 5;
        const clipId = this.normalizeClipId(eventId);
        const clipTitle = this.buildTitle(event);
        const clipDescription = this.buildDescription(event);
        const generatedAt = new Date().toISOString();
        const clipUrl = `/clips/${event.videoId}/${clipId}.mp4`;

        const clipRecord: ClipRecord = {
            clipId,
            videoId: event.videoId,
            eventId,
            segmentStart,
            segmentEnd,
            clipTitle,
            clipDescription,
            generatedAt,
            clipUrl,
        };

        await this.eventStorageService.saveClip(clipRecord);
        return clipRecord;
    }

    async listVideoClips(videoId: string): Promise<ClipRecord[]> {
        if (!videoId) {
            return [];
        }
        return this.eventStorageService.listClips(videoId);
    }
}
