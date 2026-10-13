import * as fs from 'fs';
import * as path from 'path';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
export const DATA_DIR = path.join(process.cwd(), 'data');

export function decodeBase64File(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  return Buffer.from(content, 'base64');
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveUpload(fileName: string, buffer: Buffer): string {
  ensureDir(UPLOAD_DIR);
  const safeName = path.basename(fileName);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    throw new Error('Invalid file path detected.');
  }
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
