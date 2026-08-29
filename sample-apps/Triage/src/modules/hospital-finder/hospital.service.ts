// src/modules/hospital-finder/hospital.service.ts
import { Injectable } from '@nitrostack/core';
import { HOSPITALS, Hospital } from './hospital.data.js';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class HospitalService {

  findNearest(lat: number, lng: number, requireEmergency = true, specialty?: string) {
    let candidates: Hospital[] = HOSPITALS;

    if (requireEmergency) {
      candidates = candidates.filter(h => h.emergencyReady);
    }
    if (specialty) {
      candidates = candidates.filter(h =>
        h.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    }
    // fallback: if specialty filter empties the list, drop it rather than return nothing
    if (candidates.length === 0 && specialty) {
      candidates = requireEmergency ? HOSPITALS.filter(h => h.emergencyReady) : HOSPITALS;
    }

    const ranked = candidates
      .map(h => ({ ...h, distanceKm: Math.round(haversineKm(lat, lng, h.lat, h.lng) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return ranked;
  }
}