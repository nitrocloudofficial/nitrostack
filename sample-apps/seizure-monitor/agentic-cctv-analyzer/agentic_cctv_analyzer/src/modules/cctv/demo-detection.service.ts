import { Injectable } from '@nitrostack/core';
import { BoundingBox, DetectionEvent } from './yolo-detection.service.js';

export const DEMO_OBJECT_CLASSES = [
    'person',
    'car',
    'motorcycle',
    'bicycle',
    'bus',
    'truck',
    'dog',
    'backpack',
    'suitcase',
] as const;

export type DemoObjectClass = (typeof DEMO_OBJECT_CLASSES)[number];

@Injectable()
export class DemoDetectionService {
    /**
     * Process extracted video frames and generate deterministic realistic demo detections
     */
    async processFrames(
        framePaths: string[],
        videoId: string,
        frameInterval: number = 10
    ): Promise<DetectionEvent[]> {
        const detections: DetectionEvent[] = [];

        for (let frameIdx = 0; frameIdx < framePaths.length; frameIdx++) {
            const framePath = framePaths[frameIdx];
            const timestamp = frameIdx * frameInterval;
            const frameDetections = this.generateFrameDetections(videoId, frameIdx, timestamp, framePath);
            detections.push(...frameDetections);
        }

        return detections;
    }

    /**
     * Generate deterministic detection events for a single frame based on videoId and frameNumber
     */
    private generateFrameDetections(
        videoId: string,
        frameNumber: number,
        timestamp: number,
        _framePath: string
    ): DetectionEvent[] {
        const detections: DetectionEvent[] = [];
        
        // Seed determinism from videoId hash + frameNumber
        const seed = this.hashString(`${videoId}_frame_${frameNumber}`);
        const count = 1 + (seed % 3); // 1 to 3 detections per frame

        for (let i = 0; i < count; i++) {
            const itemSeed = seed + i * 37;
            const objectClass = DEMO_OBJECT_CLASSES[itemSeed % DEMO_OBJECT_CLASSES.length];
            const confidence = Math.round((0.84 + ((itemSeed % 13) / 100)) * 100) / 100; // 0.84 - 0.96
            const trackNum = (itemSeed % 5) + 1;
            const trackId = `track_${objectClass}_${trackNum}`;

            const boundingBox = this.generateBoundingBox(objectClass, itemSeed);
            const action = this.determineAction(objectClass, itemSeed);
            const cameraId = 'cam_main_entrance';
            const id = `evt_${videoId}_f${frameNumber}_d${i + 1}`;
            const label = `${objectClass} detected in frame ${frameNumber}`;
            const description = `${objectClass} (${action}) detected at ${timestamp}s with ${Math.round(confidence * 100)}% confidence`;
            const tags = [objectClass, action, 'cctv_demo'];

            detections.push({
                id,
                videoId,
                frameNumber,
                timestamp,
                objectClass,
                confidence,
                boundingBox,
                trackId,
                action,
                cameraId,
                description,
                tags,
                label,
                severity: objectClass === 'person' || objectClass === 'backpack' ? 'high' : 'medium',
            });
        }

        return detections;
    }

    private generateBoundingBox(objectClass: DemoObjectClass, seed: number): BoundingBox {
        const xBase = (seed * 113) % 1400 + 100;
        const yBase = (seed * 197) % 600 + 150;

        switch (objectClass) {
            case 'person':
                return { x: xBase, y: yBase, width: 120, height: 290 };
            case 'car':
                return { x: xBase, y: yBase, width: 420, height: 230 };
            case 'bus':
            case 'truck':
                return { x: xBase, y: yBase, width: 550, height: 320 };
            case 'motorcycle':
            case 'bicycle':
                return { x: xBase, y: yBase, width: 180, height: 160 };
            case 'dog':
                return { x: xBase, y: yBase, width: 110, height: 90 };
            case 'backpack':
            case 'suitcase':
                return { x: xBase, y: yBase, width: 70, height: 95 };
            default:
                return { x: xBase, y: yBase, width: 150, height: 150 };
        }
    }

    private determineAction(objectClass: DemoObjectClass, seed: number): string {
        const actions = {
            person: ['walking', 'standing', 'entering_zone', 'loitering'],
            car: ['moving', 'parked', 'stopping'],
            motorcycle: ['riding', 'parked'],
            bicycle: ['riding', 'parked'],
            bus: ['in_transit', 'stopping'],
            truck: ['in_transit', 'unloading'],
            dog: ['moving', 'resting'],
            backpack: ['carried', 'unattended'],
            suitcase: ['carried', 'unattended'],
        };
        const list = actions[objectClass] || ['detected'];
        return list[seed % list.length];
    }

    private hashString(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 33) ^ str.charCodeAt(i);
        }
        return Math.abs(hash);
    }
}
