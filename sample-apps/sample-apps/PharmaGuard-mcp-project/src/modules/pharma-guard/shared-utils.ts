/**
 * Shared utilities for all PharmaGuard agents.
 * Contains common functions (Gemini API, patient loading, in-memory store)
 * that multiple agents depend on.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load patients from the JSON file
 */
export function loadPatients() {
  const dataPath = path.join(__dirname, 'data', 'patients.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw).patients;
}

/**
 * In-memory patient store for LLM-extracted patients.
 * Patients added via ingest_patient_record are stored here
 * and accessible to get_patient_profile alongside the demo patients.
 */
export const inMemoryPatients: Map<string, any> = new Map();
export let nextPatientCounter = 100;
export function incrementPatientCounter(): number {
  return nextPatientCounter++;
}

/**
 * Call Gemini API for LLM tasks.
 * Returns null on failure (quota exceeded, network error, etc.) so callers can fall back.
 */
export async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Gemini API error (${response.status})`);
      return null;
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (error) {
    console.error('Gemini API call failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}
