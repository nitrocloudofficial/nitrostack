import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { LabReport, LabReportSchema } from '../../domain/types.js';

const USERS_DIR = path.resolve(process.cwd(), 'data', 'users');

export class LabRepository {
  public getByUserId(userId: string): LabReport[] {
    const filePath = path.join(USERS_DIR, userId, 'labs.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return rawData.map((item: any) => LabReportSchema.parse(item));
  }
}
