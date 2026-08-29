import { z } from 'zod';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

// Escape special regex chars to prevent ReDoS (H4, H6 security fix)
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const bedStatusInput = z.object({
  hospital: z.string().optional().describe('Name (or partial name) of the hospital. Leave blank to search all hospitals.'),
  type: z.enum(['ICU', 'General', 'Emergency', 'Private', 'Semi-private']).describe('Type of bed'),
  city: z.string().optional().describe('City to search in if no specific hospital is named.'),
});

@Injectable({ deps: [DatabaseService] })
export class BedTools {
  constructor(private readonly db: DatabaseService) {}

  @Tool({
    name: 'bed-status',
    title: 'Check Bed Availability',
    description:
      'Check availability of hospital beds (ICU, General, Emergency, Private, Semi-private). Supports fuzzy hospital name matching and city-level search. Returns available, occupied, reserved, and maintenance counts with a human-readable summary.',
    inputSchema: bedStatusInput,
    invocation: { invoking: 'Checking bed status…', invoked: 'Bed status found' },
    metadata: { category: 'operations', tags: ['hospital', 'bed', 'icu', 'capacity'] },
  })
  async getBedStatus(input: z.infer<typeof bedStatusInput>, ctx: ExecutionContext) {
    ctx.logger.info('bed-status', input);
    const bedModel = await this.db.beds();

    const filter: Record<string, unknown> = { type: input.type };

    // Fuzzy hospital name matching (C4 fix)
    if (input.hospital && input.hospital.trim().length > 0) {
      filter.hospital = { $regex: new RegExp(escapeRegex(input.hospital.trim()), 'i') };
    } else if (input.city && input.city.trim().length > 0) {
      filter.city = { $regex: new RegExp(`^${escapeRegex(input.city.trim())}`, 'i') };
    }

    const beds = await bedModel.find(filter).lean().exec();

    if (beds.length === 0) {
      // Fallback: return total availability for the bed type across all hospitals
      const fallbackBeds = await bedModel.find({ type: input.type }).lean().exec();
      const available = fallbackBeds.filter(b => b.status === 'Available').length;
      return {
        hospital: input.hospital ?? 'All Hospitals',
        type: input.type,
        total: fallbackBeds.length,
        available,
        occupied: fallbackBeds.filter(b => b.status === 'Occupied').length,
        reserved: fallbackBeds.filter(b => b.status === 'Reserved').length,
        maintenance: fallbackBeds.filter(b => b.status === 'Maintenance').length,
        utilizationPercent: fallbackBeds.length > 0 ? Math.round(((fallbackBeds.length - available) / fallbackBeds.length) * 100) : 0,
        searchNote: `No exact match for "${input.hospital ?? input.city}". Showing system-wide ${input.type} bed data.`,
        summary: `System-wide: ${available} of ${fallbackBeds.length} ${input.type} beds are available across all hospitals.`,
      };
    }

    const available = beds.filter(b => b.status === 'Available').length;
    const occupied = beds.filter(b => b.status === 'Occupied').length;
    const reserved = beds.filter(b => b.status === 'Reserved').length;
    const maintenance = beds.filter(b => b.status === 'Maintenance').length;
    const utilizationPercent = beds.length > 0 ? Math.round(((beds.length - available) / beds.length) * 100) : 0;

    return {
      hospital: input.hospital ?? 'All Hospitals',
      type: input.type,
      total: beds.length,
      available,
      occupied,
      reserved,
      maintenance,
      utilizationPercent,
      alert: utilizationPercent >= 90 ? `⚠️ CRITICAL: ${input.type} utilization is at ${utilizationPercent}%. Consider diverting patients.` : null,
      summary: `${available} of ${beds.length} ${input.type} beds are available (${utilizationPercent}% utilization). ${utilizationPercent >= 90 ? 'HIGH LOAD.' : utilizationPercent >= 70 ? 'Moderate load.' : 'Capacity normal.'}`,
    };
  }
}
