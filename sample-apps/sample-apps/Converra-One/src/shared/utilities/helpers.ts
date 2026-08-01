import { PriorityLevel } from '../enums/priority.enum.js';

/**
 * UUID v4 Generator helper
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format timestamp into readable ISO string
 */
export function formatTimestamp(date?: Date | string | number): string {
  const d = date ? new Date(date) : new Date();
  return d.toISOString();
}

/**
 * Priority Calculator Placeholder (To be enhanced by AI in Phase 2)
 */
export function calculatePriorityPlaceholder(text: string, isUrgentFlag?: boolean): PriorityLevel {
  if (isUrgentFlag || text.toLowerCase().includes('urgent') || text.toLowerCase().includes('asap')) {
    return PriorityLevel.URGENT;
  }
  if (text.toLowerCase().includes('important') || text.toLowerCase().includes('deadline')) {
    return PriorityLevel.HIGH;
  }
  return PriorityLevel.MEDIUM;
}

/**
 * Validate whether a string is valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Perform a clean deep clone of an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely parse JSON string with fallback default
 */
export function safeParseJson<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}
