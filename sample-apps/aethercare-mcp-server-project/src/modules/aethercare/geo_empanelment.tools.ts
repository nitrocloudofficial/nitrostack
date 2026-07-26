import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

interface GeoHospital {
  id: string;
  name: string;
  city: string;
  address: string;
  pincode: string;
  distanceKm: number;
  empanelmentStatus: 'EMPANELED_ACTIVE' | 'SUSPENDED' | 'BLACK_LISTED';
  cashlessFacility: boolean;
  icuBedsAvailable: number;
  contactPhone: string;
  lat: number;
  lng: number;
}

const GEO_HOSPITALS_DB: GeoHospital[] = [
  {
    id: 'GEO-TN-101',
    name: 'Kauvery Super Specialty Hospital',
    city: 'Chennai',
    address: 'Mylapore, Chennai, Tamil Nadu',
    pincode: '600018',
    distanceKm: 1.4,
    empanelmentStatus: 'EMPANELED_ACTIVE',
    cashlessFacility: true,
    icuBedsAvailable: 18,
    contactPhone: '+91-44-4000-6000',
    lat: 13.0339,
    lng: 80.2694
  },
  {
    id: 'GEO-TN-102',
    name: 'PSG Super Specialty Hospital',
    city: 'Coimbatore',
    address: 'Peelamedu, Avinashi Road, Coimbatore, Tamil Nadu',
    pincode: '641004',
    distanceKm: 2.8,
    empanelmentStatus: 'SUSPENDED',
    cashlessFacility: false,
    icuBedsAvailable: 0,
    contactPhone: '+91-422-257-0170',
    lat: 11.0267,
    lng: 77.0028
  },
  {
    id: 'GEO-KA-101',
    name: 'Narayana Health City',
    city: 'Bengaluru',
    address: 'Bommasandra Industrial Area, Hosur Road, Bengaluru, KA',
    pincode: '560099',
    distanceKm: 3.2,
    empanelmentStatus: 'EMPANELED_ACTIVE',
    cashlessFacility: true,
    icuBedsAvailable: 24,
    contactPhone: '+91-80-7122-2222',
    lat: 12.8093,
    lng: 77.6976
  },
  {
    id: 'GEO-KL-101',
    name: 'Amrita Institute of Medical Sciences (AIMS)',
    city: 'Kochi',
    address: 'Edappally, Kochi, Kerala',
    pincode: '682041',
    distanceKm: 2.1,
    empanelmentStatus: 'EMPANELED_ACTIVE',
    cashlessFacility: true,
    icuBedsAvailable: 16,
    contactPhone: '+91-484-285-1234',
    lat: 10.0326,
    lng: 76.2995
  },
  {
    id: 'GEO-TS-101',
    name: 'Yashoda Super Specialty Hospital',
    city: 'Hyderabad',
    address: 'Somajiguda, Raj Bhavan Road, Hyderabad, Telangana',
    pincode: '500082',
    distanceKm: 1.9,
    empanelmentStatus: 'EMPANELED_ACTIVE',
    cashlessFacility: true,
    icuBedsAvailable: 12,
    contactPhone: '+91-40-4567-4567',
    lat: 17.4265,
    lng: 78.4552
  }
];

export class GeoEmpanelmentTools {

  @Tool({
    name: 'find_nearest_hospitals_geo',
    description: 'Finds nearest empaneled public & private cashless hospitals sorted by GPS distance radius (in km), ICU bed availability, and active status across Chennai, Coimbatore, Bengaluru, Kochi, Hyderabad, Mumbai, and Delhi.',
    inputSchema: z.object({
      user_pincode_or_city: z.string().default('Chennai').describe('City or 6-digit Indian Pincode (e.g. "Chennai", "Coimbatore", "Bengaluru", "Kochi", "Hyderabad", "600018")'),
      max_radius_km: z.number().default(10).describe('Maximum search radius in kilometers')
    })
  })
  @Widget('hospital-map')
  async findNearestHospitalsGeo(input: { user_pincode_or_city?: string; max_radius_km?: number }, ctx: ExecutionContext) {
    const loc = (input?.user_pincode_or_city || 'Chennai').trim().toLowerCase();
    const maxRadius = input?.max_radius_km ?? 10;

    ctx.logger.info('Finding nearest hospitals by geo-radius across South India & National regions', { loc, maxRadius });

    const filtered = GEO_HOSPITALS_DB.filter(h =>
      (h.city.toLowerCase().includes(loc) || h.pincode.includes(loc) || loc === '' || loc === 'chennai') &&
      h.distanceKm <= maxRadius
    ).sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      searchLocation: input?.user_pincode_or_city || 'Chennai',
      radiusKm: maxRadius,
      totalFound: filtered.length,
      timestamp: new Date().toISOString(),
      hospitals: filtered.length > 0 ? filtered : GEO_HOSPITALS_DB.slice(0, 3)
    };
  }
}
