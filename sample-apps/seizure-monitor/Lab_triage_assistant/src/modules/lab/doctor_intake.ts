/**
 * Doctor Intake Tool
 *
 * Interactive patient intake: asks four mandatory questions in order,
 * collects answers, and returns a structured intake summary with a
 * recommended specialist, reason, and general precautionary advice.
 *
 * Important: This tool does NOT diagnose or prescribe medicines.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { buildOnlineLinks, fetchNearbyClinics } from './medical-assistant.tool.js';

const Questions = [
  'What health problem are you currently experiencing?',
  'How long have you been experiencing this problem?',
  'Have you tried any home remedies?',
  'Are you currently taking any medication?'
];

const DoctorIntakeInputSchema = z.object({
  // Partial or full list of responses. The tool will prompt for the
  // next unanswered question when fewer than 4 responses are provided.
  responses: z.array(z.string()).optional(),
  appointmentPreference: z.enum(['online', 'offline']).optional(),
  location: z.string().optional()
});

const IntakeSummarySchema = z.object({
  recommendedSpecialist: z.string(),
  reason: z.string(),
  generalAdvice: z.string()
});

const OnlineLinksSchema = z.object({
  apollo: z.string().url(),
  practo: z.string().url()
});

const NearbyClinicSchema = z.object({
  name: z.string(),
  rating: z.number().nullable(),
  address: z.string(),
  mapsLink: z.string().url()
});

const AppointmentSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('online'),
    online_links: OnlineLinksSchema
  }),
  z.object({
    mode: z.literal('offline'),
    location: z.string(),
    nearby_clinics: z.array(NearbyClinicSchema)
  })
]);

const DoctorIntakeOutputSchema = z.union([
  z.object({
    done: z.literal(false),
    nextQuestionIndex: z.number(),
    question: z.string()
  }),
  z.object({
    done: z.literal(true),
    responses: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    summary: IntakeSummarySchema,
    appointment: AppointmentSchema,
    nextStep: z.string()
  })
]);

function recommendSpecialist(problem: string) {
  const lower = problem.toLowerCase();

  if (/chest|angina|heart|breath(ing)?/i.test(lower)) {
    return { specialist: 'Cardiologist', reason: 'Chest pain or cardiac-related symptoms' };
  }

  if (/fever|temperature|febrile|heat/i.test(lower)) {
    return { specialist: 'General Physician', reason: 'Fever or systemic infection symptoms' };
  }

  if (/rash|skin|dermatitis|itch|eczema/i.test(lower)) {
    return { specialist: 'Dermatologist', reason: 'Skin-related symptoms' };
  }

  if (/vision|eye|blurr|blind|sight|floaters/i.test(lower)) {
    return { specialist: 'Ophthalmologist', reason: 'Vision or eye-related symptoms' };
  }

  // fallback
  return { specialist: 'General Physician', reason: 'Non-specific symptom; recommend general assessment' };
}

export class DoctorIntakeTools {
  @Tool({
    name: 'doctor_intake',
    description: 'Interactive patient intake: asks four mandatory questions, returns a structured intake summary, and offers appointment recommendations without diagnosing or prescribing medicines.',
    inputSchema: DoctorIntakeInputSchema,
    outputSchema: DoctorIntakeOutputSchema,
    examples: {
      request: { responses: [] },
      response: { done: false, nextQuestionIndex: 0, question: Questions[0] }
    }
  })
  async doctorIntake(input: z.infer<typeof DoctorIntakeInputSchema>, ctx: ExecutionContext): Promise<z.infer<typeof DoctorIntakeOutputSchema>> {
    const responses = input.responses ?? [];

    ctx.logger.info(`Doctor intake called with ${responses.length} response(s)`);

    if (responses.length < Questions.length) {
      const idx = responses.length;
      return { done: false, nextQuestionIndex: idx, question: Questions[idx] };
    }

    if (!input.appointmentPreference) {
      return {
        done: false,
        nextQuestionIndex: 4,
        question: 'Would you like to book an online appointment or find nearby clinics? (online/offline)'
      };
    }

    if (input.appointmentPreference === 'offline' && !input.location) {
      return {
        done: false,
        nextQuestionIndex: 5,
        question: 'Please provide your location so I can find nearby specialist clinics.'
      };
    }

    const [problem, duration, homeRemedies, medications] = responses.slice(0, 4);
    const rec = recommendSpecialist(problem || '');

    const generalAdvice = `Seek timely evaluation by a ${rec.specialist}. If symptoms worsen (severe pain, difficulty breathing, sudden weakness, or high fever), seek emergency care.`;
    const summary = {
      recommendedSpecialist: rec.specialist,
      reason: rec.reason,
      generalAdvice
    };

    let appointment;
    let nextStep = '';

    if (input.appointmentPreference === 'offline') {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        ctx.logger.error('Google Places API key is not configured in environment variables');
        throw new Error('Missing GOOGLE_PLACES_API_KEY environment variable for offline clinic search');
      }
      const nearby_clinics = await fetchNearbyClinics(rec.specialist, input.location ?? '', apiKey);
      appointment = {
        mode: 'offline' as const,
        location: input.location ?? '',
        nearby_clinics
      };
      nextStep = 'Choose a nearby clinic and use the provided Google Maps search link to book an appointment or contact the clinic directly.';
    } else {
      appointment = {
        mode: 'online' as const,
        online_links: buildOnlineLinks(rec.specialist)
      };
      nextStep = `Use the online booking links to schedule a consultation with a ${rec.specialist}.`;
    }

    ctx.logger.info(`Intake complete; recommended ${rec.specialist} with appointment mode ${appointment.mode}`);

    return {
      done: true,
      responses: [problem || '', duration || '', homeRemedies || '', medications || ''],
      summary,
      appointment,
      nextStep
    };
  }
}
