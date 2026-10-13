import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { DatabaseService } from '../../database/db.js';
import * as fs from 'fs';
import * as path from 'path';

export class FactoryResources {
  private readonly dbService = new DatabaseService();

  private extractMachineId(uri: string, prefix: string): string {
    return uri.replace(prefix, '').trim();
  }

  @Resource({
    uri: 'factory://manuals/{machine_id}',
    name: 'Machine Manuals',
    description: 'The industrial operating and maintenance manual for a specific machine.',
    mimeType: 'text/plain'
  })
  async getManual(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Resource requested: ${uri}`);

    const machineId = this.extractMachineId(uri, 'factory://manuals/');
    const manualsDir = path.join(process.cwd(), 'resources', 'manuals');
    const filePath = path.join(manualsDir, `${machineId}-manual.txt`);

    let text = `No manual file found for machine ${machineId}`;

    if (fs.existsSync(filePath)) {
      text = fs.readFileSync(filePath, 'utf8');
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text
        }
      ]
    };
  }

  @Resource({
    uri: 'factory://maintenance/{machine_id}',
    name: 'Maintenance History',
    description: 'SQLite maintenance history records for a specific machine.',
    mimeType: 'application/json'
  })
  async getMaintenance(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Resource requested: ${uri}`);

    const machineId = this.extractMachineId(uri, 'factory://maintenance/');

    const logs = await this.dbService.all(
      'SELECT * FROM Maintenance WHERE machine_id = ? ORDER BY date DESC',
      [machineId]
    );

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(logs, null, 2)
        }
      ]
    };
  }

  @Resource({
    uri: 'factory://production/schedule',
    name: 'Production Schedule',
    description: 'The current active factory production schedules and priority matrix.',
    mimeType: 'application/json'
  })
  async getProductionSchedule(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Resource requested: ${uri}`);

    const schedule = await this.dbService.all(
      'SELECT p.*, m.machine_name, m.status FROM Production p JOIN Machines m ON p.machine_id = m.machine_id'
    );

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(schedule, null, 2)
        }
      ]
    };
  }

  @Resource({
    uri: 'factory://machines/specs',
    name: 'Machine Specifications',
    description: 'List of all operational machines, their physical locations, and status metrics.',
    mimeType: 'application/json'
  })
  async getMachineSpecs(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Resource requested: ${uri}`);

    const machines = await this.dbService.all('SELECT * FROM Machines');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(machines, null, 2)
        }
      ]
    };
  }
}