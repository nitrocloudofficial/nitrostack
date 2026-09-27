import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';
import { UserDocument } from '../schemas/user.schema.js';

/**
 * User Repository
 *
 * Provides database CRUD operations for user authentication accounts in the MongoDB 'users' collection.
 */
@Injectable({ deps: [MongoService] })
export class UserRepository {
  constructor(private readonly mongoService: MongoService) {}

  async create(user: UserDocument): Promise<UserDocument> {
    const collection = await this.mongoService.getUsersCollection();
    const document = {
      ...user,
      email: user.email.toLowerCase().trim(),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
    await collection.insertOne(document as any);
    return document;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const collection = await this.mongoService.getUsersCollection();
    const result = await collection.findOne({ email: email.toLowerCase().trim() });
    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as UserDocument;
  }

  async findByUserId(userId: string): Promise<UserDocument | null> {
    const collection = await this.mongoService.getUsersCollection();
    const result = await collection.findOne({ userId });
    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as UserDocument;
  }

  async update(userId: string, updateData: Partial<UserDocument>): Promise<boolean> {
    const collection = await this.mongoService.getUsersCollection();
    const result = await collection.updateOne(
      { userId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return result.modifiedCount > 0;
  }
}
