import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { DiscoveryService } from './discovery.service.js';

const searchDoctorsInput = z.object({
  specialty: z
    .string()
    .optional()
    .describe(
      'Medical specialty as the patient said it, e.g. "cardiologist", "cardiology", "dermatologist", "paediatrician". Matched fuzzily against specialty names and aliases.',
    ),
  city: z
    .string()
    .optional()
    .describe('City to search in, e.g. "Pune", "Mumbai", "Bengaluru", "Delhi".'),
  maxFee: z
    .number()
    .positive()
    .optional()
    .describe('Optional maximum consultation fee in INR.'),
  minRating: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .describe('Optional minimum rating (1-5).'),
  acceptsInsurance: z
    .boolean()
    .optional()
    .describe('Whether the patient prefers a doctor who accepts insurance.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO format YYYY-MM-DD')
    .optional()
    .describe('Optional calendar date to check availability for.'),
  sortBy: z
    .enum(['rating', 'distance', 'fee', 'earliest'])
    .optional()
    .describe('How to sort the results.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe('Maximum number of doctor cards to return (default 10).'),
});

const compareSlotsInput = z.object({
  doctorIds: z
    .array(z.string().min(1))
    .min(1)
    .max(4)
    .describe(
      'Doctor ids to compare side by side, in display order. Use the `doctorId` values returned by search-doctors, e.g. ["doc_pune_card_01", "doc_pune_card_02"].',
    ),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO format YYYY-MM-DD')
    .describe('Calendar date to compare, ISO format YYYY-MM-DD, e.g. "2026-07-28".'),
  mode: z
    .enum(['in-person', 'video'])
    .optional()
    .describe('Optionally restrict to in-person or video consultations.'),
});

/**
 * Patient-facing discovery surface: find a clinician, then compare their open
 * consultation windows before committing to a booking.
 */
@Injectable({ deps: [DiscoveryService] })
export class DiscoveryTools {
  constructor(private readonly discovery: DiscoveryService) {}

  @Tool({
    name: 'search-doctors',
    title: 'Search doctors',
    description:
      'Find doctors in the Arogya provider directory by specialty and city. Returns doctor cards with photo, hospital, qualifications, consultation fee, rating and live slot availability. Use the returned `doctorId` values for compare-slots and book-appointment.',
    inputSchema: searchDoctorsInput,
    invocation: {
      invoking: 'Searching the provider directory…',
      invoked: 'Found matching doctors',
    },
    metadata: { category: 'discovery', tags: ['doctors', 'search', 'directory'] },
    examples: {
      request: { specialty: 'cardiologist', city: 'Pune', limit: 10 },
      response: {
        query: { specialty: 'cardiologist', city: 'Pune' },
        count: 3,
        doctors: [
          {
            doctorId: 'doc_pune_card_01',
            name: 'Dr. Rohan Deshmukh',
            specialty: 'Cardiologist',
            city: 'Pune',
            hospital: 'Sahyadri Super Speciality Hospital',
            consultationFee: 900,
            currency: 'INR',
            rating: 4.8,
            openSlotCount: 17,
            nextAvailable: '2026-07-28 09:30',
          },
        ],
      },
    },
  })
  @Widget({
    route: 'doctors',
    prefersBorder: true,
    csp: { resourceDomains: ['https://images.unsplash.com'] },
  })
  async searchDoctors(
    input: z.infer<typeof searchDoctorsInput>,
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('search-doctors', {
      specialty: input.specialty,
      city: input.city,
      maxFee: input.maxFee,
      minRating: input.minRating,
      acceptsInsurance: input.acceptsInsurance,
      sortBy: input.sortBy,
      date: input.date,
    });

    try {
      const { doctors, recommendation } = await this.discovery.searchDoctors({
        specialty: input.specialty,
        city: input.city,
        maxFee: input.maxFee,
        minRating: input.minRating,
        acceptsInsurance: input.acceptsInsurance,
        date: input.date,
        sortBy: input.sortBy,
        limit: input.limit ?? 10,
      });

      return {
        query: {
          specialty: input.specialty ?? null,
          city: input.city ?? null,
        },
        count: doctors.length,
        doctors,
        recommendation,
        summary: doctors.length === 0
          ? `This demo currently contains providers primarily in major hubs like Pune, Mumbai, Bangalore, and Delhi. No doctors found exactly matching the criteria.`
          : `Found ${doctors.length} doctors. ${recommendation || ''}`,
        nextStep: doctors.length > 0
          ? 'Call compare-slots with two or more doctorId values and a date (YYYY-MM-DD).'
          : 'Suggest nearest major cities, offer teleconsultation, or offer emergency guidance. Do not end the conversation.',
      };
    } catch (error: any) {
      ctx.logger.error('search-doctors failed', { error: error.message });
      return { error: true, message: `Search failed: ${error.message}` };
    }
  }

  @Tool({
    name: 'compare-slots',
    title: 'Compare open slots',
    description:
      'Compare the open consultation slots of two or more doctors on a specific date, side by side. Returns one column per doctor with every available slot (start time, end time, mode, fee) plus earliest/latest availability. Use the returned `slotId` to book.',
    inputSchema: compareSlotsInput,
    invocation: {
      invoking: 'Comparing open slots…',
      invoked: 'Slot comparison ready',
    },
    metadata: { category: 'discovery', tags: ['slots', 'availability', 'compare'] },
    examples: {
      request: {
        doctorIds: ['doc_pune_card_01', 'doc_pune_card_02'],
        date: '2026-07-28',
      },
      response: {
        date: '2026-07-28',
        columns: [
          {
            doctorId: 'doc_pune_card_01',
            name: 'Dr. Rohan Deshmukh',
            availableCount: 6,
            earliest: '09:30',
            latest: '18:00',
            slots: [
              {
                slotId: 'slot_doc_pune_card_01_20260728_1700',
                startTime: '17:00',
                endTime: '17:30',
                mode: 'in-person',
                fee: 900,
              },
            ],
          },
        ],
      },
    },
  })
  async compareSlots(
    input: z.infer<typeof compareSlotsInput>,
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('compare-slots', {
      doctorIds: input.doctorIds,
      date: input.date,
      mode: input.mode,
    });

    try {
      const { columns, unknownDoctorIds, recommendedSlot, recommendedReason } = await this.discovery.compareSlots({
        doctorIds: input.doctorIds,
        date: input.date,
        mode: input.mode,
      });

    // Times that appear in EVERY column — the easiest thing for a patient to act on.
    const commonTimes =
      columns.length > 1
        ? columns
            .map((column) => column.slots.map((slot) => slot.startTime))
            .reduce((shared, times) => shared.filter((time) => times.includes(time)))
        : (columns[0]?.slots.map((slot) => slot.startTime) ?? []);

    const summaryLines = columns.map(
      (column) =>
        `${column.name} (${column.hospital}, ₹${column.consultationFee}): ${
          column.availableCount === 0
            ? 'no open slots'
            : `${column.availableCount} open — ${column.slots.map((slot) => slot.startTime).join(', ')}`
        }`,
    );

      return {
        date: input.date,
        mode: input.mode ?? 'any',
        columns,
        commonTimes,
        unknownDoctorIds,
        recommendedSlot,
        recommendedReason,
        summary: columns.length === 0
          ? `No matching doctors found for the supplied ids on ${input.date}.`
          : `Slot comparison for ${input.date}:\n${summaryLines.join('\n')}\n${recommendedReason || ''}`,
        nextStep: 'Call book-appointment with the chosen doctorId and slot details.',
      };
    } catch (error: any) {
      ctx.logger.error('compare-slots failed', { error: error.message });
      return { error: true, message: `Compare slots failed: ${error.message}` };
    }
  }

  @Tool({
    name: 'doctor-summary',
    title: 'AI Doctor Profile Summary',
    description: 'Generate a comprehensive summary for a specific doctor, including experience, languages, specialty, hospital, and recommendations.',
    inputSchema: z.object({ doctorId: z.string() }),
    invocation: {
      invoking: 'Generating doctor profile…',
      invoked: 'Profile generated',
    },
    metadata: { category: 'discovery', tags: ['profile', 'summary'] },
  })
  async doctorSummary(input: { doctorId: string }, ctx: ExecutionContext) {
    ctx.logger.info('doctor-summary invoked', { doctorId: input.doctorId });
    
    // H1 fix: Direct O(1) DB lookup instead of scanning 50 results
    const doctorModel = await this.discovery['db'].doctors();
    const doc = await doctorModel.findOne({ doctorId: input.doctorId }).lean().exec();

    if (!doc) {
      return { error: true, message: `Doctor with id "${input.doctorId}" not found. Use search-doctors to find a valid doctorId.` };
    }

    const slotModel = await this.discovery['db'].slots();
    const openSlots = await slotModel.countDocuments({ doctorId: input.doctorId, status: 'available' });
    const nextSlot = await slotModel.findOne({ doctorId: input.doctorId, status: 'available' }).sort({ date: 1, startTime: 1 }).lean().exec();

    return {
      doctorId: doc.doctorId,
      name: doc.name,
      specialty: doc.specialty,
      hospital: doc.hospital,
      city: doc.city,
      qualifications: doc.qualifications,
      experienceYears: doc.experienceYears,
      languages: doc.languages,
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      consultationFee: doc.consultationFee,
      currency: doc.currency,
      acceptsInsurance: doc.acceptsInsurance,
      bio: doc.bio,
      imageUrl: doc.imageUrl,
      availability: {
        openSlots,
        nextAvailable: nextSlot ? `${nextSlot.date} ${nextSlot.startTime}` : null,
      },
      recommendation: `I recommend Dr. ${doc.name} because:\n• ${doc.experienceYears} years of experience\n• Rated ${doc.rating}★ (${doc.reviewCount} reviews)\n• Consultation fee ₹${doc.consultationFee}\n• ${doc.acceptsInsurance ? 'Accepts insurance' : 'No insurance accepted'}\n• ${openSlots} slots currently available`,
      summary: `**Dr. ${doc.name}** — ${doc.specialty} at ${doc.hospital}, ${doc.city}. ${doc.experienceYears} years experience. Rated ${doc.rating}★. Fee ₹${doc.consultationFee}. ${openSlots} open slots.`,
    };
  }
}
