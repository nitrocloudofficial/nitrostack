import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';
import { TimelineDocument, TimelineEvent } from '../schemas/timeline.schema.js';

/**
 * Timeline Repository
 *
 * Provides CRUD database operations for the 'timelines' MongoDB collection.
 */
@Injectable({ deps: [MongoService] })
export class TimelineRepository {
  constructor(private readonly mongoService: MongoService) {}

  async create(timeline: TimelineDocument): Promise<TimelineDocument> {
    const collection = await this.mongoService.getTimelinesCollection();
    await collection.insertOne(timeline as any);
    return timeline;
  }

  async findByPatientId(patientId: string): Promise<TimelineDocument | null> {
    const collection = await this.mongoService.getTimelinesCollection();
    const result = await collection.findOne({ patientId });
    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as TimelineDocument;
  }

  async saveTimeline(patientId: string, events: TimelineEvent[]): Promise<TimelineDocument> {
    const collection = await this.mongoService.getTimelinesCollection();
    const document: TimelineDocument = {
      patientId,
      generatedAt: new Date().toISOString(),
      events,
    };

    await collection.updateOne(
      { patientId },
      { $set: document as any },
      { upsert: true }
    );

    return document;
  }

  async delete(patientId: string): Promise<boolean> {
    const collection = await this.mongoService.getTimelinesCollection();
    const result = await collection.deleteOne({ patientId });
    return result.deletedCount > 0;
  }
}
