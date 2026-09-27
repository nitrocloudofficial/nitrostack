import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { IntakeLog, IntakeLogSchema } from '../../domain/types.js';

const RUNTIME_DIR = path.resolve(process.cwd(), 'data', 'runtime');

export class IntakeRepository {
  public getTodayByUserId(userId: string): IntakeLog[] {
    const filePath = path.join(RUNTIME_DIR, userId, 'intake-today.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return rawData.map((item: any) => IntakeLogSchema.parse(item));
  }

  public getStatSync(userId: string) {
    const filePath = path.join(RUNTIME_DIR, userId, 'intake-today.json');
    return fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  }
}
