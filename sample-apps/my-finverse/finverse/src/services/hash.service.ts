import { Injectable } from '@nitrostack/core';
import crypto from 'crypto';

@Injectable()
export class HashService {
  generateSHA256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
