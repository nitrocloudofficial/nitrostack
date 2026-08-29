import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';
import { ReportDocument } from '../schemas/report.schema.js';

/**
 * Report Repository
 *
 * Provides CRUD database operations for the 'reports' MongoDB collection.
 */
@Injectable({ deps: [MongoService] })
export class ReportRepository {
  constructor(private readonly mongoService: MongoService) {}

  async create(report: ReportDocument): Promise<ReportDocument> {
    const collection = await this.mongoService.getReportsCollection();
    const document = {
      ...report,
      reportId: report.reportId.trim(),
      patientId: report.patientId.trim(),
      uploadedAt: report.uploadedAt || new Date().toISOString(),
    };

    console.error(`[ReportRepository] Inserting document into MongoDB Atlas 'reports' collection:`, JSON.stringify(document, null, 2));
    await collection.insertOne(document as any);
    console.error(`[ReportRepository] Successfully inserted document with reportId: '${document.reportId}'`);
    return document;
  }

  async findById(reportId: string): Promise<ReportDocument | null> {
    const cleanReportId = reportId ? reportId.trim() : '';
    const collection = await this.mongoService.getReportsCollection();

    console.error(`[ReportRepository] Executing Mongo query: collection.findOne({ reportId: '${cleanReportId}' })`);
    const result = await collection.findOne({ reportId: cleanReportId });
    console.error(`[ReportRepository] Query result for reportId '${cleanReportId}':`, result ? `FOUND (_id: ${result._id})` : 'NULL (NOT FOUND)');

    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as ReportDocument;
  }

  async findByPatientId(patientId: string): Promise<ReportDocument[]> {
    const cleanPatientId = patientId ? patientId.trim() : '';
    const collection = await this.mongoService.getReportsCollection();
    const cursor = collection.find({ patientId: cleanPatientId });
    const results = await cursor.toArray();
    return results.map((r: any) => {
      const { _id, ...doc } = r;
      return doc as ReportDocument;
    });
  }

  async update(reportId: string, updateData: Record<string, any>): Promise<boolean> {
    const cleanReportId = reportId ? reportId.trim() : '';
    const collection = await this.mongoService.getReportsCollection();
    const result = await collection.updateOne({ reportId: cleanReportId }, { $set: updateData });
    return result.modifiedCount > 0;
  }

  async delete(reportId: string): Promise<boolean> {
    const cleanReportId = reportId ? reportId.trim() : '';
    const collection = await this.mongoService.getReportsCollection();
    const result = await collection.deleteOne({ reportId: cleanReportId });
    return result.deletedCount > 0;
  }
}
