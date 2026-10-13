import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

@Injectable({ deps: [DbService] })
export class ProductionService {
  constructor(private db: DbService) {}

  async getSchedules() {
    return await this.db.query<any>(`SELECT * FROM production_lines`);
  }

  async rerouteProduction(affectedLineId: string, alternativeLineId: string, shiftId: string) {
    const affectedLine = await this.db.get<any>(
      `SELECT * FROM production_lines WHERE id = ?`,
      [affectedLineId]
    );

    if (!affectedLine) {
      throw new Error(`Production line ${affectedLineId} not found.`);
    }

    const jobToTransfer = affectedLine.active_job || 'JOB-UNKNOWN';

    // Update affected line to indicate it is stopped/held
    await this.db.run(
      `UPDATE production_lines 
       SET status = 'Safety Hold', active_job = 'None', output_rate = '0 units/hr' 
       WHERE id = ?`,
      [affectedLineId]
    );

    // Update alternative line to take over the job
    await this.db.run(
      `UPDATE production_lines 
       SET status = 'Running (Rerouted)', active_job = ?, output_rate = '140 units/hr' 
       WHERE id = ?`,
      [jobToTransfer + ' (Transferred)', alternativeLineId]
    );

    return {
      rerouteId: `RRT-${Date.now()}`,
      affectedLineId,
      alternativeLineId,
      shiftId,
      transferredJob: jobToTransfer,
      status: 'EXECUTED',
      timestamp: new Date().toISOString()
    };
  }
}
