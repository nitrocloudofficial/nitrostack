/**
 * Medical Assistant Tool
 *
 * Provides online booking links or offline nearby clinic recommendations based
 * on the inferred specialist recommendation.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const MedicalAssistantInputSchema = z.object({
  specialist: z.string().describe('Inferred specialist, e.g. Cardiologist'),
  reason: z.string().describe('Reason for the specialist recommendation'),
  preference: z.enum(['online', 'offline']).describe('Preferred appointment mode'),
  location: z.string().optional().describe('Patient location used for offline clinic search')
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

const OnlineResponseSchema = z.object({
  specialist: z.string(),
  reason: z.string(),
  mode: z.literal('online'),
  online_links: OnlineLinksSchema,
  next_step: z.string()
});

const OfflineResponseSchema = z.object({
  specialist: z.string(),
  reason: z.string(),
  mode: z.literal('offline'),
  nearby_clinics: z.array(NearbyClinicSchema),
  next_step: z.string()
});

const MedicalAssistantOutputSchema = z.discriminatedUnion('mode', [
  OnlineResponseSchema,
  OfflineResponseSchema
]);

function normalizeSpecialist(specialist: string) {
  return specialist.trim().replace(/\s+/g, '-');
}

export function buildOnlineLinks(specialist: string) {
  const slug = normalizeSpecialist(specialist);
  const apolloSpecialist = slug.endsWith('s') ? slug : `${slug}s`;

  return {
    apollo: `https://www.apollo247.com/specialties/${encodeURIComponent(apolloSpecialist)}`,
    practo: `https://www.practo.com/${encodeURIComponent(slug)}`
  };
}

export async function fetchNearbyClinics(specialist: string, location: string, apiKey: string) {
  const query = `${specialist} near ${location}`;
  const params = new URLSearchParams({
    query,
    key: apiKey
  });

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
  const response = await fetch(url);
  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{
      name?: string;
      rating?: number;
      formatted_address?: string;
      vicinity?: string;
    }>;
  };

  if (!response.ok || payload.status !== 'OK') {
    return [];
  }

  return (payload.results ?? [])
    .filter((result): result is { name: string; rating?: number; formatted_address?: string; vicinity?: string } => typeof result.name === 'string')
    .slice(0, 5)
    .map(result => ({
      name: result.name,
      rating: typeof result.rating === 'number' ? result.rating : null,
      address: result.formatted_address ?? result.vicinity ?? '',
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    }));
}

export class MedicalAssistantTools {
  @Tool({
    name: 'medical_assistant',
    description: 'Provide online booking links or nearby offline clinics for a recommended specialist. Reads Google Places API key from environment variables for offline mode.',
    inputSchema: MedicalAssistantInputSchema,
    outputSchema: MedicalAssistantOutputSchema,
    examples: {
      request: { specialist: 'Cardiologist', reason: 'Chest pain and abnormal lipid panel', preference: 'online' },
      response: {
        specialist: 'Cardiologist',
        reason: 'Chest pain and abnormal lipid panel',
        mode: 'online',
        online_links: {
          apollo: 'https://www.apollo247.com/specialties/Cardiologists',
          practo: 'https://www.practo.com/Cardiologist'
        },
        next_step: 'Use the booking links to schedule an online consultation with a Cardiologist.'
      }
    }
  })
  async medicalAssistant(
    input: z.infer<typeof MedicalAssistantInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof MedicalAssistantOutputSchema>> {
    ctx.logger.info(`Medical assistant requested for ${input.specialist} in ${input.preference} mode`);

    if (input.preference === 'online') {
      const online_links = buildOnlineLinks(input.specialist);
      return {
        specialist: input.specialist,
        reason: input.reason,
        mode: 'online',
        online_links,
        next_step: `Use the booking links to schedule an online consultation with a ${input.specialist}.`
      };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      ctx.logger.error('Google Places API key is not configured in environment variables');
      throw new Error('Missing GOOGLE_PLACES_API_KEY environment variable for offline clinic search');
    }

    if (!input.location) {
      ctx.logger.error('Offline preference requested without a location');
      throw new Error('Location is required for offline specialist search');
    }

    const nearby_clinics = await fetchNearbyClinics(input.specialist, input.location, apiKey);
    return {
      specialist: input.specialist,
      reason: input.reason,
      mode: 'offline',
      nearby_clinics,
      next_step: 'Review the nearby clinics and select one that fits your location and convenience.'
    };
  }
}
