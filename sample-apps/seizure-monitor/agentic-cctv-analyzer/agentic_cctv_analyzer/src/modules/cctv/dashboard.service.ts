import { Injectable } from '@nitrostack/core';
import { EventStorageService } from './event-storage.service.js';

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
const ANIMAL_CLASSES = ['dog'];
const OBJECT_CLASSES = ['backpack', 'suitcase'];
const PEOPLE_CLASS = ['person'];
const RECENT_LIMIT = 5;

export interface DashboardRecentVideo {
    videoId: string;
    filename: string;
    analyzedAt: string;
    eventCount: number;
}

export interface DashboardRecentEvent {
    id: string;
    videoId: string;
    timestamp: number;
    objectClass: string;
    label?: string;
    confidence: number;
}

export interface DashboardRecentClip {
    clipId: string;
    videoId: string;
    eventId: string;
    clipTitle: string;
    generatedAt: string;
}

export interface DashboardObjectDistribution {
    objectClass: string;
    count: number;
}

export interface DashboardStats {
    totalVideos: number;
    totalAnalyses: number;
    totalEvents: number;
    totalPeople: number;
    totalVehicles: number;
    totalAnimals: number;
    totalObjects: number;
    totalClips: number;
    totalSummaries: number;
    recentVideos: DashboardRecentVideo[];
    recentEvents: DashboardRecentEvent[];
    recentClips: DashboardRecentClip[];
    objectDistribution: DashboardObjectDistribution[];
}

@Injectable({ deps: [EventStorageService] })
export class DashboardService {
    constructor(private readonly eventStorageService: EventStorageService) {}

    async getDashboardStats(): Promise<DashboardStats> {
        const records = await this.eventStorageService.listAnalyses();

        let totalEvents = 0;
        let totalPeople = 0;
        let totalVehicles = 0;
        let totalAnimals = 0;
        let totalObjects = 0;
        let totalClips = 0;
        let totalSummaries = 0;

        const objectCounts = new Map<string, number>();
        const allClips: DashboardRecentClip[] = [];
        const allEvents: DashboardRecentEvent[] = [];

        for (const record of records) {
            const events = record.events ?? [];
            totalEvents += events.length;

            if (record.videoSummary) {
                totalSummaries += 1;
            }

            const clips = record.clips ?? [];
            totalClips += clips.length;

            for (const clip of clips) {
                allClips.push({
                    clipId: clip.clipId,
                    videoId: clip.videoId,
                    eventId: clip.eventId,
                    clipTitle: clip.clipTitle,
                    generatedAt: clip.generatedAt,
                });
            }

            for (const event of events) {
                const objectClass = (event.objectClass || 'unknown').toLowerCase();

                if (PEOPLE_CLASS.includes(objectClass)) {
                    totalPeople += 1;
                }
                if (VEHICLE_CLASSES.includes(objectClass)) {
                    totalVehicles += 1;
                }
                if (ANIMAL_CLASSES.includes(objectClass)) {
                    totalAnimals += 1;
                }
                if (OBJECT_CLASSES.includes(objectClass)) {
                    totalObjects += 1;
                }

                objectCounts.set(objectClass, (objectCounts.get(objectClass) ?? 0) + 1);

                allEvents.push({
                    id: event.id,
                    videoId: event.videoId,
                    timestamp: event.timestamp,
                    objectClass: event.objectClass,
                    label: event.label,
                    confidence: event.confidence,
                });
            }
        }

        const recentVideos = [...records]
            .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
            .slice(0, RECENT_LIMIT)
            .map((record) => ({
                videoId: record.videoId,
                filename: record.filename,
                analyzedAt: record.analyzedAt,
                eventCount: record.events?.length ?? 0,
            }));

        const recentEvents = allEvents
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, RECENT_LIMIT);

        const recentClips = allClips
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            .slice(0, RECENT_LIMIT);

        const objectDistribution = Array.from(objectCounts.entries())
            .map(([objectClass, count]) => ({ objectClass, count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalVideos: records.length,
            totalAnalyses: records.length,
            totalEvents,
            totalPeople,
            totalVehicles,
            totalAnimals,
            totalObjects,
            totalClips,
            totalSummaries,
            recentVideos,
            recentEvents,
            recentClips,
            objectDistribution,
        };
    }
}
