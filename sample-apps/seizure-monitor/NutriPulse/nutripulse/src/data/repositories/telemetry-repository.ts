import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { BiometricSnapshot, BiometricSnapshotSchema } from '../../domain/types.js';

const USERS_DIR = path.resolve(process.cwd(), 'data', 'users');

export class TelemetryRepository {
  public getByUserId(userId: string): BiometricSnapshot[] {
    const filePath = path.join(USERS_DIR, userId, 'telemetry.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return rawData.map((item: any) => BiometricSnapshotSchema.parse(item));
  }

  public getStatSync(userId: string) {
    const filePath = path.join(USERS_DIR, userId, 'telemetry.json');
    return fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  }
}
