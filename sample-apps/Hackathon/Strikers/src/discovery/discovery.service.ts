import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';
import type { DoctorEntity } from '../database/schemas/doctor.schema.js';
import type { SlotEntity } from '../database/schemas/slot.schema.js';

/** A doctor card as rendered by the `doctors` widget. */
export interface DoctorCard {
  doctorId: string;
  name: string;
  specialty: string;
  city: string;
  hospital: string;
  address: string;
  qualifications: string;
  experienceYears: number;
  languages: string[];
  consultationFee: number;
  currency: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  bio: string;
  /** Count of still-open slots across the published calendar. */
  openSlotCount: number;
  /** Soonest open slot, e.g. "2026-07-28 09:30". */
  nextAvailable: string | null;
  acceptsInsurance: boolean;
  distance: number;
  estimatedWaitingTime: number;
}

/** One open slot option in a comparison column. */
export interface SlotOption {
  slotId: string;
  startTime: string;
  endTime: string;
  mode: string;
  fee: number;
}

/** A single doctor's column in the side-by-side comparison. */
export interface SlotComparisonColumn {
  doctorId: string;
  name: string;
  specialty: string;
  hospital: string;
  city: string;
  imageUrl: string;
  consultationFee: number;
  currency: string;
  rating: number;
  availableCount: number;
  bookedCount: number;
  earliest: string | null;
  latest: string | null;
  slots: SlotOption[];
}

/**
 * Read-side logic for doctor discovery and slot comparison.
 * Keeps Mongo queries and query-normalisation out of the tool controllers.
 */
@Injectable({ deps: [DatabaseService] })
export class DiscoveryService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Normalise loose user input ("Cardiologist", "heart doctor", "CARDIO") into
   * a regex-safe token we can match against `specialtySlug`, `specialty` and
   * `specialtyAliases`.
   */
  private normalise(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Search the directory. Both filters are optional and both are fuzzy:
   * specialty matches display name / slug / aliases, city matches a prefix so
   * "pune" finds "Pune". Results are enriched with live slot availability.
   */
  async searchDoctors(params: {
    specialty?: string;
    city?: string;
    maxFee?: number;
    minRating?: number;
    acceptsInsurance?: boolean;
    date?: string;
    sortBy?: 'rating' | 'distance' | 'fee' | 'earliest';
    limit: number;
  }): Promise<{ doctors: DoctorCard[]; matchedSpecialty: string | null; matchedCity: string | null; recommendation?: string }> {
    const doctorModel = await this.db.doctors();

    const filter: Record<string, unknown> = {};

    if (params.specialty) {
      const token = this.escapeRegex(this.normalise(params.specialty));
      // Strip a trailing "ist"/"y" so "cardiologist" also hits "cardiology".
      const stem = token.replace(/(ists?|ians?|y|ics?)$/u, '');
      const pattern = new RegExp(stem.length >= 4 ? stem : token, 'i');
      filter.$or = [
        { specialty: pattern },
        { specialtySlug: pattern },
        { specialtyAliases: pattern },
      ];
    }

    if (params.city) {
      filter.city = new RegExp(`^${this.escapeRegex(this.normalise(params.city))}`, 'i');
    }

    if (typeof params.maxFee === 'number') {
      filter.consultationFee = { $lte: params.maxFee };
    }

    if (typeof params.minRating === 'number') {
      filter.rating = { $gte: params.minRating };
    }

    if (typeof params.acceptsInsurance === 'boolean') {
      filter.acceptsInsurance = params.acceptsInsurance;
    }

    let sortQuery: Record<string, 1 | -1> = { rating: -1, experienceYears: -1 };
    
    if (params.sortBy === 'distance') {
      sortQuery = { distance: 1 };
    } else if (params.sortBy === 'fee') {
      sortQuery = { consultationFee: 1 };
    }

    const docs = await doctorModel
      .find(filter)
      .sort(sortQuery)
      .limit(params.limit)
      .lean<DoctorEntity[]>()
      .exec();

    let cards = await Promise.all(docs.map((doc) => this.toCard(doc)));

    // Filter by availability date if requested
    if (params.date) {
      cards = cards.filter((card) => card.nextAvailable?.startsWith(params.date!));
    }

    if (params.sortBy === 'earliest') {
      cards.sort((a, b) => {
        if (!a.nextAvailable) return 1;
        if (!b.nextAvailable) return -1;
        return a.nextAvailable.localeCompare(b.nextAvailable);
      });
    }

    let recommendation = undefined;
    if (cards.length > 0) {
      const top = cards[0];
      recommendation = `I recommend Dr. ${top.name} because:
• Highly rated (${top.rating}★)
• Consultation fee is ₹${top.consultationFee}
• Only ${top.distance} km away
• ${top.acceptsInsurance ? 'Accepts your insurance' : 'Does not accept insurance'}`;
    }

    return {
      doctors: cards,
      matchedSpecialty: docs[0]?.specialty ?? null,
      matchedCity: docs[0]?.city ?? null,
      recommendation,
    };
  }

  /** Attach live availability figures to a directory row. */
  private async toCard(doc: DoctorEntity): Promise<DoctorCard> {
    const slotModel = await this.db.slots();

    const open = await slotModel
      .find({ doctorId: doc.doctorId, status: 'available' })
      .sort({ date: 1, startTime: 1 })
      .lean<SlotEntity[]>()
      .exec();

    const first = open[0];

    return {
      doctorId: doc.doctorId,
      name: doc.name,
      specialty: doc.specialty,
      city: doc.city,
      hospital: doc.hospital,
      address: doc.address,
      qualifications: doc.qualifications,
      experienceYears: doc.experienceYears,
      languages: doc.languages ?? [],
      consultationFee: doc.consultationFee,
      currency: doc.currency ?? 'INR',
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      imageUrl: doc.imageUrl,
      bio: doc.bio ?? '',
      acceptsInsurance: doc.acceptsInsurance ?? false,
      distance: doc.distance ?? 0,
      estimatedWaitingTime: doc.estimatedWaitingTime ?? 15,
      openSlotCount: open.length,
      nextAvailable: first ? `${first.date} ${first.startTime}` : null,
    };
  }

  /**
   * Build one comparison column per requested doctor for a single date.
   * Unknown doctor ids are reported back rather than silently dropped so the
   * model can correct itself.
   */
  async compareSlots(params: {
    doctorIds: string[];
    date: string;
    mode?: 'in-person' | 'video';
  }): Promise<{ columns: SlotComparisonColumn[]; unknownDoctorIds: string[]; recommendedSlot?: { doctorId: string; slotId: string } | null; recommendedReason?: string | null }> {
    const doctorModel = await this.db.doctors();
    const slotModel = await this.db.slots();

    const docs = await doctorModel
      .find({ doctorId: { $in: params.doctorIds } })
      .lean<DoctorEntity[]>()
      .exec();

    const byId = new Map(docs.map((doc) => [doc.doctorId, doc]));
    const unknownDoctorIds = params.doctorIds.filter((id) => !byId.has(id));
    const columns: SlotComparisonColumn[] = [];

    // Preserve the caller's ordering so "first two cardiologists" stays stable.
    for (const doctorId of params.doctorIds) {
      const doc = byId.get(doctorId);
      if (!doc) continue;

      const slotFilter: Record<string, unknown> = { doctorId, date: params.date };
      if (params.mode) slotFilter.mode = params.mode;

      const slots = await slotModel
        .find(slotFilter)
        .sort({ startTime: 1 })
        .lean<SlotEntity[]>()
        .exec();

      const available = slots.filter((slot) => slot.status === 'available');

      columns.push({
        doctorId: doc.doctorId,
        name: doc.name,
        specialty: doc.specialty,
        hospital: doc.hospital,
        city: doc.city,
        imageUrl: doc.imageUrl,
        consultationFee: doc.consultationFee,
        currency: doc.currency ?? 'INR',
        rating: doc.rating,
        availableCount: available.length,
        bookedCount: slots.length - available.length,
        earliest: available[0]?.startTime ?? null,
        latest: available[available.length - 1]?.startTime ?? null,
        slots: available.map((slot) => ({
          slotId: slot.slotId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          mode: slot.mode,
          fee: slot.fee,
        })),
      });
    }

    let recommendedSlot = null;
    let recommendedReason = null;
    if (columns.length > 0) {
      // Find doctor with highest rating and earliest availability
      const bestCol = [...columns].sort((a, b) => {
        if (a.rating !== b.rating) return b.rating - a.rating;
        return (a.earliest ?? '23:59').localeCompare(b.earliest ?? '23:59');
      })[0];
      if (bestCol && bestCol.slots.length > 0) {
        const slot = bestCol.slots[0];
        recommendedSlot = { doctorId: bestCol.doctorId, slotId: slot.slotId };
        recommendedReason = `I recommend ${bestCol.name} at ${slot.startTime} because they have the highest rating (${bestCol.rating}★) and the earliest availability.`;
      }
    }

    return { columns, unknownDoctorIds, recommendedSlot, recommendedReason };
  }
}
