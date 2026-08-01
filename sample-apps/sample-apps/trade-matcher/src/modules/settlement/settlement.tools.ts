import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

interface SettlementWindow {
  startHour: number;
  endHour: number;
  cycle: string;
}

const SETTLEMENT_WINDOWS: Record<string, SettlementWindow> = {
  EQUITY: { startHour: 9, endHour: 16, cycle: 'T+1 same-day batch, 9:00-16:00' },
  FX: { startHour: 0, endHour: 24, cycle: 'T+2 continuous settlement' },
  BOND: { startHour: 8, endHour: 17, cycle: 'T+1 same-day batch, 8:00-17:00' },
};

export class SettlementTools {
  @Tool({
    name: 'get_settlement_window',
    description: 'Check if a given hour falls inside the known settlement/batch window for an instrument type',
    inputSchema: z.object({
      instrumentType: z.enum(['EQUITY', 'FX', 'BOND']).describe('Type of instrument being settled'),
      hour: z.number().min(0).max(23).describe('Hour of day (0-23) the trade was booked'),
    }),
  })
  async getSettlementWindow(input: { instrumentType: string; hour: number }, ctx: ExecutionContext) {
    ctx.logger.info('Checking settlement window', { instrumentType: input.instrumentType, hour: input.hour });
    const window = SETTLEMENT_WINDOWS[input.instrumentType];
    if (!window) {
      return { found: false, message: `No settlement data for ${input.instrumentType}` };
    }
    const withinWindow = input.hour >= window.startHour && input.hour < window.endHour;
    return { found: true, withinWindow, window: window.cycle };
  }
}