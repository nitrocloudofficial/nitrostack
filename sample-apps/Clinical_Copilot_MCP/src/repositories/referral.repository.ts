import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';
import { ReferralDocument } from '../schemas/referral.schema.js';

/**
 * Referral Repository
 *
 * Provides CRUD database operations for the 'referrals' MongoDB collection.
 */
@Injectable({ deps: [MongoService] })
export class ReferralRepository {
  constructor(private readonly mongoService: MongoService) {}

  async create(referral: ReferralDocument): Promise<ReferralDocument> {
    const collection = await this.mongoService.getReferralsCollection();
    const document = {
      ...referral,
      createdAt: referral.createdAt || new Date().toISOString(),
    };
    await collection.insertOne(document as any);
    return document;
  }

  async findById(referralId: string): Promise<ReferralDocument | null> {
    const collection = await this.mongoService.getReferralsCollection();
    const result = await collection.findOne({ referralId });
    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as ReferralDocument;
  }

  async findByPatientId(patientId: string): Promise<ReferralDocument[]> {
    const collection = await this.mongoService.getReferralsCollection();
    const cursor = collection.find({ patientId });
    const results = await cursor.toArray();
    return results.map((r: any) => {
      const { _id, ...doc } = r;
      return doc as ReferralDocument;
    });
  }

  async delete(referralId: string): Promise<boolean> {
    const collection = await this.mongoService.getReferralsCollection();
    const result = await collection.deleteOne({ referralId });
    return result.deletedCount > 0;
  }
}
