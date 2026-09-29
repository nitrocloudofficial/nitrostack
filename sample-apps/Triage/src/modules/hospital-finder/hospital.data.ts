// src/modules/hospital-finder/hospital.data.ts

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  specialties: string[];
  phone: string;
  emergencyReady: boolean;
}

// sample seed — swap/expand with real rows from Hospitals-in-India dataset
export const HOSPITALS: Hospital[] = [
  {
    id: 'sgh-vadodara',
    name: 'Sunshine General Hospital',
    address: 'Alkapuri, Vadodara, Gujarat',
    lat: 22.3072, lng: 73.1812,
    specialties: ['cardiology', 'emergency', 'trauma'],
    phone: '0265-1234567',
    emergencyReady: true
  },
  {
    id: 'city-care-vadodara',
    name: 'City Care Multispeciality Hospital',
    address: 'Fatehgunj, Vadodara, Gujarat',
    lat: 22.3181, lng: 73.1929,
    specialties: ['general', 'pediatrics', 'orthopedics'],
    phone: '0265-2345678',
    emergencyReady: true
  },
  {
    id: 'apex-vadodara',
    name: 'Apex Multispeciality Hospital',
    address: 'Gotri, Vadodara, Gujarat',
    lat: 22.2891, lng: 73.1547,
    specialties: ['emergency', 'neurology', 'general'],
    phone: '0265-3456789',
    emergencyReady: false
  }
];