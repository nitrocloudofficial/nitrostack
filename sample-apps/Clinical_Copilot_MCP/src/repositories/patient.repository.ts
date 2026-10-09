import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';
import { PatientDocument } from '../schemas/patient.schema.js';

/**
 * Patient Repository
 *
 * Provides CRUD database operations and smart profile merging for the 'patients' collection.
 */
@Injectable({ deps: [MongoService] })
export class PatientRepository {
  constructor(private readonly mongoService: MongoService) {}

  async create(patient: PatientDocument): Promise<PatientDocument> {
    const collection = await this.mongoService.getPatientsCollection();
    const document = {
      ...patient,
      createdAt: patient.createdAt || new Date().toISOString(),
      updatedAt: patient.updatedAt || new Date().toISOString(),
    };
    await collection.insertOne(document as any);
    return document;
  }

  async findById(patientId: string): Promise<PatientDocument | null> {
    const collection = await this.mongoService.getPatientsCollection();
    const result = await collection.findOne({ patientId });
    if (!result) return null;
    const { _id, ...doc } = result as any;
    return doc as PatientDocument;
  }

  async findAll(filter: Record<string, any> = {}): Promise<PatientDocument[]> {
    const collection = await this.mongoService.getPatientsCollection();
    const cursor = collection.find(filter);
    const results = await cursor.toArray();
    return results.map((r: any) => {
      const { _id, ...doc } = r;
      return doc as PatientDocument;
    });
  }

  async update(patientId: string, updateData: Partial<PatientDocument>): Promise<boolean> {
    const collection = await this.mongoService.getPatientsCollection();
    const result = await collection.updateOne(
      { patientId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Smart profile merge: Merges extracted report data into existing patient profile
   * without blindly overwriting missing or existing fields.
   */
  async mergePatientProfile(patientId: string, extracted: Record<string, any>): Promise<PatientDocument> {
    const existing = await this.findById(patientId);

    if (!existing) {
      const newPatient: PatientDocument = {
        patientId,
        name: extracted.name || 'Unknown Patient',
        age: extracted.age || 0,
        gender: extracted.gender || 'Unknown',
        disease: extracted.disease || 'Unspecified',
        diagnosis: extracted.diagnosis || 'Unspecified',
        medications: extracted.medications || [],
        labValues: extracted.labValues || {},
        doctor: extracted.doctor || 'Unassigned',
        hospital: extracted.hospital || 'Unassigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return await this.create(newPatient);
    }

    // Merge medications and lab values cleanly
    const mergedMedications = Array.from(
      new Set([...(existing.medications || []), ...(extracted.medications || [])])
    );
    const mergedLabValues = {
      ...(existing.labValues || {}),
      ...(extracted.labValues || {}),
    };

    const updateData: Partial<PatientDocument> = {
      name: extracted.name || existing.name,
      age: extracted.age ?? existing.age,
      gender: extracted.gender || existing.gender,
      disease: extracted.disease || existing.disease,
      diagnosis: extracted.diagnosis || existing.diagnosis,
      doctor: extracted.doctor || existing.doctor,
      hospital: extracted.hospital || existing.hospital,
      medications: mergedMedications,
      labValues: mergedLabValues,
      updatedAt: new Date().toISOString(),
    };

    await this.update(patientId, updateData);
    return { ...existing, ...updateData };
  }

  async delete(patientId: string): Promise<boolean> {
    const collection = await this.mongoService.getPatientsCollection();
    const result = await collection.deleteOne({ patientId });
    return result.deletedCount > 0;
  }
}
