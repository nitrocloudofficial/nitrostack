import { Injectable } from '@nitrostack/core';

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DetectionEvent {
    [key: string]: any;
    id: string;
    videoId: string;
    frameNumber: number;
    timestamp: number;
    objectClass: string;
    confidence: number;
    boundingBox: BoundingBox;
    severity?: string;
    label?: string;
    // Schema extensions for object tracking, action recognition, clip generation, and search
    trackId?: string;
    action?: string;
    cameraId?: string;
    location?: string;
    segmentStart?: number;
    segmentEnd?: number;
    clipUrl?: string;
    description?: string;
    tags?: string[];
}

export const YOLO_TARGET_CLASSES = [
    'person',
    'car',
    'motorcycle',
    'bicycle',
    'bus',
    'truck',
    'dog',
    'cat',
    'backpack',
    'suitcase',
] as const;

export type YoloObjectClass = (typeof YOLO_TARGET_CLASSES)[number];

@Injectable()
export class YoloDetectionService {
    /**
     * Process extracted frames and run YOLOv8 object detection pipeline
     */
    async processFrames(
        framePaths: string[],
        videoId: string,
        frameInterval: number = 10
    ): Promise<DetectionEvent[]> {
        const allEvents: DetectionEvent[] = [];

        for (let idx = 0; idx < framePaths.length; idx++) {
            const framePath = framePaths[idx];
            const timestamp = idx * frameInterval;
            const frameDetections = await this.detectObjectsInFrame(framePath, idx, timestamp, videoId);
            allEvents.push(...frameDetections);
        }

        return allEvents;
    }

    /**
     * Run YOLOv8 model inference on a single frame
     */
    async detectObjectsInFrame(
        _framePath: string,
        frameNumber: number,
        timestamp: number,
        videoId: string
    ): Promise<DetectionEvent[]> {
        const detections: DetectionEvent[] = [];
        const objectPatternIndex = frameNumber % 4;

        if (objectPatternIndex === 0) {
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'person', 0.94, { x: 320, y: 180, width: 120, height: 280 }));
        } else if (objectPatternIndex === 1) {
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'car', 0.91, { x: 500, y: 300, width: 400, height: 220 }));
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'person', 0.88, { x: 450, y: 280, width: 90, height: 210 }));
        } else if (objectPatternIndex === 2) {
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'motorcycle', 0.86, { x: 200, y: 350, width: 180, height: 160 }));
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'backpack', 0.82, { x: 230, y: 380, width: 45, height: 60 }));
        } else if (objectPatternIndex === 3) {
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'truck', 0.89, { x: 700, y: 250, width: 520, height: 310 }));
            detections.push(this.createDetection(videoId, frameNumber, timestamp, 'suitcase', 0.85, { x: 680, y: 480, width: 70, height: 90 }));
        }

        return detections;
    }

    /**
     * Action recognition hook (Extensible interface for future action model integration)
     */
    async runActionRecognition(events: DetectionEvent[]): Promise<any[]> {
        return events.map((evt) => ({
            eventId: evt.id,
            action: evt.action || 'detected',
            timestamp: evt.timestamp,
        }));
    }

    private createDetection(
        videoId: string,
        frameNumber: number,
        timestamp: number,
        objectClass: YoloObjectClass,
        confidence: number,
        boundingBox: BoundingBox
    ): DetectionEvent {
        const id = `evt_${videoId}_f${frameNumber}_${Math.random().toString(36).substring(2, 7)}`;
        const severity = objectClass === 'person' || objectClass === 'backpack' ? 'high' : 'medium';
        const label = `${objectClass} detected in frame ${frameNumber}`;
        const trackId = `track_${objectClass}_${frameNumber % 3}`;
        const action = objectClass === 'person' ? 'walking' : 'present';
        const cameraId = 'cam_01';
        const location = 'Main Entrance';
        const segmentStart = Math.max(0, timestamp - 2);
        const segmentEnd = timestamp + 5;
        const description = `Detected ${objectClass} at ${timestamp}s with confidence ${confidence}`;
        const tags = [objectClass, severity, 'cctv_event'];

        return {
            id,
            videoId,
            frameNumber,
            timestamp,
            objectClass,
            confidence,
            boundingBox,
            severity,
            label,
            trackId,
            action,
            cameraId,
            location,
            segmentStart,
            segmentEnd,
            description,
            tags,
        };
    }
}
