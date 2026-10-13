import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { userProfileStore } from './vayu.resources.js';

export const sessionTierStore = new Map<string, string>();

export class VayuTools {
  @Tool({
    name: 'fetch_uv_index',
    description: 'Fetches the current UV index for a given latitude and longitude.',
    inputSchema: z.object({
      lat: z.number().describe('Latitude of the location'),
      lon: z.number().describe('Longitude of the location')
    })
  })
  @Widget('uv-dashboard')
  async fetchUvIndex(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching UV index', { lat: input.lat, lon: input.lon });
    
    // FETCH FIX: Grab the daily maximum UV index and adjust for timezone
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${input.lat}&longitude=${input.lon}&daily=uv_index_max&forecast_days=1&timezone=auto`;
    const response = await fetch(url);
    const data: any = await response.json();
    
    // PARSE FIX: Read the first item in the daily max array
    const currentUv = data.daily.uv_index_max[0];
    
    return { 
      uv_index: currentUv,
      latitude: input.lat,
      longitude: input.lon
    };
  }

  @Tool({
    name: 'set_user_skin_type',
    description: 'Saves the user Fitzpatrick skin type (1-6) to memory for the session.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      skinType: z.number().min(1).max(6).describe('Fitzpatrick skin type (1-6)')
    })
  })
  async setSkinType(input: any, ctx: ExecutionContext) {
    userProfileStore.set(input.userId, { skinType: input.skinType });
    return { success: true, userId: input.userId, skinType: input.skinType };
  }

  @Tool({
    name: 'classify_uv_risk',
    description: 'Maps a raw UV index to WHO official risk tiers.',
    inputSchema: z.object({
      uvIndex: z.number().describe('The raw UV index number')
    })
  })
  async classifyRisk(input: any, ctx: ExecutionContext) {
    let tier = 'Extreme';
    if (input.uvIndex <= 2) tier = 'Low';
    else if (input.uvIndex <= 5) tier = 'Moderate';
    else if (input.uvIndex <= 7) tier = 'High';
    else if (input.uvIndex <= 10) tier = 'Very High';
    
    return { uvIndex: input.uvIndex, riskTier: tier };
  }

  @Tool({
    name: 'calculate_safe_exposure_window',
    description: 'Calculates safe sun exposure time in minutes based on UV and user skin type.',
    inputSchema: z.object({
      uvIndex: z.number().describe('The raw UV index number'),
      userId: z.string().describe('The user ID to fetch the skin type for')
    })
  })
  async calculateExposure(input: any, ctx: ExecutionContext) {
    if (input.uvIndex === 0) return { safeExposureMinutes: 'Unlimited (No UV)' };

    // Read from the in-memory map
    const profile = userProfileStore.get(input.userId) || { skinType: 3 }; 
    const skinType = profile.skinType;

    // Clinical burn time multipliers
    const multipliers: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.6, 4: 2.0, 5: 3.2, 6: 6.0 };
    const multiplier = multipliers[skinType] || 1.6;
    
    const minutes = Math.round((200 * multiplier) / (3 * input.uvIndex));
    
    return { 
      uvIndex: input.uvIndex, 
      skinType,
      safeExposureMinutes: minutes 
    };
  }

  @Tool({
    name: 'check_escalation',
    description: 'Compares current UV tier against the last stored tier to trigger alerts.',
    inputSchema: z.object({
      userId: z.string().describe('The user ID'),
      currentTier: z.string().describe('The current WHO risk tier')
    })
  })
  async checkEscalation(input: any, ctx: ExecutionContext) {
    const lastTier = sessionTierStore.get(input.userId);
    
    sessionTierStore.set(input.userId, input.currentTier);

    const isChanged = lastTier !== undefined && lastTier !== input.currentTier;
    const isExtreme = input.currentTier === 'Extreme';

    return {
      userId: input.userId,
      previousTier: lastTier || 'None (First Check)',
      currentTier: input.currentTier,
      triggerAlert: isChanged || isExtreme
    };
  }
}