import 'dotenv/config';
import path from 'node:path';

export const PORT = Number(process.env.PORT) || 4000;

export const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const DATA_DIR = path.join(__dirname, '..', 'data');
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
