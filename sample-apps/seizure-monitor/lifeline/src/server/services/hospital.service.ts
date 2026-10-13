import { Injectable } from '@nitrostack/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Hospital,
  NearbyHospitalResult,
  HospitalCapabilitiesResult,
  ResourceAvailabilityResult,
  BedType,
} from '../interfaces/index.js';
import { HospitalNotFoundError, NoHospitalsFoundError, NoBedsAvailableError } from '../shared/app-error.js';
import { DistanceCalculator } from '../utils/distance.calculator.js';

/**
 * Owns the in-memory hospital dataset (JSON mock database). Loaded once at
 * construction and mutated in place as beds are reserved, so it must remain a
 * singleton for the lifetime of the server process.
 */
@Injectable()
export class HospitalService {
  private readonly hospitals: Hospital[];

  constructor() {
    const dataPath = path.join(process.cwd(), 'src', 'server', 'data', 'hospitals.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    this.hospitals = JSON.parse(raw) as Hospital[];
  }

  getAll(): Hospital[] {
    return this.hospitals;
  }

  getById(hospitalId: string): Hospital {
    const hospital = this.hospitals.find((h) => h.hospital_id === hospitalId);
    if (!hospital) {
      throw new HospitalNotFoundError(hospitalId);
    }
    return hospital;
  }

  getNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    requiredCapability?: string
  ): NearbyHospitalResult[] {
    const results: NearbyHospitalResult[] = [];

    for (const hospital of this.hospitals) {
      if (requiredCapability && !hospital.capabilities.includes(requiredCapability)) {
        continue;
      }

      const distanceKm = DistanceCalculator.calculateHaversineDistanceKm(
        latitude,
        longitude,
        hospital.latitude,
        hospital.longitude
      );

      if (distanceKm <= radiusKm) {
        results.push({ ...hospital, distance_km: distanceKm });
      }
    }

    if (results.length === 0) {
      throw new NoHospitalsFoundError(requiredCapability ?? 'any specialization');
    }

    return results.sort((a, b) => a.distance_km - b.distance_km);
  }

  getCapabilities(hospitalId: string): HospitalCapabilitiesResult {
    const hospital = this.getById(hospitalId);
    return {
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.hospital_name,
      city: hospital.city,
      capabilities: hospital.capabilities,
      languages: hospital.languages,
      verification_status: hospital.verification_status,
      phone_number: hospital.phone_number,
      is_operational: hospital.er_beds_available > 0 || hospital.icu_beds_available > 0,
    };
  }

  checkAvailability(hospitalId: string): ResourceAvailabilityResult {
    const hospital = this.getById(hospitalId);
    return {
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.hospital_name,
      er_beds_available: hospital.er_beds_available,
      icu_beds_available: hospital.icu_beds_available,
      estimated_er_wait_minutes: hospital.estimated_er_wait_minutes,
      is_operational: hospital.er_beds_available > 0 || hospital.icu_beds_available > 0,
    };
  }

  decrementBed(hospitalId: string, bedType: BedType): void {
    const hospital = this.getById(hospitalId);
    const field: 'icu_beds_available' | 'er_beds_available' =
      bedType === 'ICU' ? 'icu_beds_available' : 'er_beds_available';

    if (hospital[field] <= 0) {
      throw new NoBedsAvailableError(hospital.hospital_name);
    }

    hospital[field] -= 1;
  }
}
