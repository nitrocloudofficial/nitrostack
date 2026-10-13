import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { Hospital } from '../schemas/hospital.schema.js';
import { Specialty } from '../schemas/specialty.schema.js';
import { Doctor } from '../schemas/doctor.schema.js';
import { PatientHistory } from '../schemas/patient-history.schema.js';
import { v4 as uuidv4 } from 'uuid';

interface SeedData {
  hospitals: Hospital[];
  specialties: Specialty[];
  doctors: Doctor[];
  patientHistories: PatientHistory[];
}

interface IntakeRecord {
  recordId: string;
  name: string;
  age: number;
  weight: number;
  patientId: string;
  symptoms: string[];
  urgency: string;
  timestamp: string;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  weight: number;
  symptoms: string[];
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
  };
  createdAt: string;
}

interface Booking {
  bookingId: string;
  recordId: string;
  doctorId: string;
  hospitalId: string;
  appointmentSlot: string;
  createdAt: string;
}

interface TriageResult {
  patientId: string;
  recordId?: string;
  predictedCondition: string;
  urgencyLevel: string;
  detectedRedFlags: Array<{
    id: string;
    description: string;
    severity: number;
    category: string;
  }>;
  confidenceScore: number;
  timestamp: string;
}

@Injectable()
export class DataService {
  private seedData: SeedData | null = null;
  private intakeRecords: Map<string, IntakeRecord> = new Map();
  private patients: Map<string, PatientRecord> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private triageResults: Map<string, TriageResult> = new Map();

  private loadSeedData(): SeedData {
    if (this.seedData) {
      return this.seedData;
    }

    const seedPath = path.join(process.cwd(), 'fixtures', 'seed.json');
    const rawData = fs.readFileSync(seedPath, 'utf-8');
    this.seedData = JSON.parse(rawData) as SeedData;
    return this.seedData;
  }

  getHospitals(): Hospital[] {
    const data = this.loadSeedData();
    return data.hospitals;
  }

  getHospitalById(id: string): Hospital | undefined {
    const data = this.loadSeedData();
    return data.hospitals.find((h) => h.id === id);
  }

  getSpecialties(): Specialty[] {
    const data = this.loadSeedData();
    return data.specialties;
  }

  getSpecialtyById(id: string): Specialty | undefined {
    const data = this.loadSeedData();
    return data.specialties.find((s) => s.id === id);
  }

  getDoctors(): Doctor[] {
    const data = this.loadSeedData();
    return data.doctors;
  }

  getDoctorsBySpecialty(specialtyId: string): Doctor[] {
    const data = this.loadSeedData();
    return data.doctors.filter((d) => d.specialty === specialtyId);
  }

  getDoctorsByHospital(hospitalId: string): Doctor[] {
    const data = this.loadSeedData();
    return data.doctors.filter((d) => d.hospital === hospitalId);
  }

  getPatientHistories(): PatientHistory[] {
    const data = this.loadSeedData();
    return data.patientHistories;
  }

  getPatientHistoryById(patientId: string): PatientHistory | undefined {
    const data = this.loadSeedData();
    return data.patientHistories.find((ph) => ph.patientId === patientId);
  }

  searchDoctors(specialtyQuery: string) {
    const data = this.loadSeedData();
    const query = specialtyQuery.toLowerCase();

    // Find matching specialty
    const specialty = data.specialties.find(
      (s) => s.id.toLowerCase() === query || s.name.toLowerCase() === query
    );

    if (!specialty) return [];

    const doctors = data.doctors.filter((d) => d.specialty === specialty.id);

    return doctors.map((d) => {
      const hospital = data.hospitals.find((h) => h.id === d.hospital);
      return {
        id: d.id,
        name: d.name,
        specialtyId: specialty.id,
        specialtyName: specialty.name,
        hospitalId: d.hospital,
        hospitalName: hospital ? hospital.name : 'Unknown Hospital',
        imageUrl: d.imageUrl
      };
    });
  }

  storeIntakeRecord(record: IntakeRecord): void {
    this.intakeRecords.set(record.recordId, record);
  }

  getIntakeRecord(recordId: string): IntakeRecord | undefined {
    return this.intakeRecords.get(recordId);
  }

  // Patient intake methods
  storePatientRecord(input: {
    name: string;
    age: number;
    weight: number;
    symptoms: string[];
    medicalHistory?: {
      conditions?: string[];
      medications?: string[];
      allergies?: string[];
    };
  }): string {
    const patientId = uuidv4();
    const record: PatientRecord = {
      id: patientId,
      name: input.name,
      age: input.age,
      weight: input.weight,
      symptoms: input.symptoms,
      medicalHistory: input.medicalHistory,
      createdAt: new Date().toISOString()
    };
    this.patients.set(patientId, record);
    return patientId;
  }

  getPatientRecord(patientId: string): PatientRecord {
    const record = this.patients.get(patientId);
    if (!record) {
      throw new Error(`Patient record not found for ID: ${patientId}`);
    }
    return record;
  }

  storeBooking(input: {
    recordId: string;
    doctorId: string;
    hospitalId: string;
    appointmentSlot: string;
  }): string {
    const bookingId = `booking-${Date.now()}`;
    this.bookings.set(bookingId, {
      bookingId,
      recordId: input.recordId,
      doctorId: input.doctorId,
      hospitalId: input.hospitalId,
      appointmentSlot: input.appointmentSlot,
      createdAt: new Date().toISOString()
    });
    return bookingId;
  }

  getBooking(bookingId: string): Booking | undefined {
    return this.bookings.get(bookingId);
  }

  storeTriageResult(input: {
    patientId: string;
    recordId?: string;
    predictedCondition: string;
    urgencyLevel: string;
    detectedRedFlags: Array<{
      id: string;
      description: string;
      severity: number;
      category: string;
    }>;
    confidenceScore: number;
    timestamp: string;
  }): void {
    const key = input.recordId || input.patientId;
    this.triageResults.set(key, {
      patientId: input.patientId,
      recordId: input.recordId,
      predictedCondition: input.predictedCondition,
      urgencyLevel: input.urgencyLevel,
      detectedRedFlags: input.detectedRedFlags,
      confidenceScore: input.confidenceScore,
      timestamp: input.timestamp
    });
  }

  getTriageResult(recordId: string): TriageResult | undefined {
    return this.triageResults.get(recordId);
  }
}
