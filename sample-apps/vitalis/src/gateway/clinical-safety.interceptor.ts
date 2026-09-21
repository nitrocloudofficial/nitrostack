/**
 * ClinicalSafetyInterceptor — Interceptor enforcing clinical safety.
 * Post-processes output: overreach rewrite, urgency escalation, multi-language disclaimer injection, synthetic-data stamp.
 * Supported languages: EN (English), ES (Spanish), HI (Hindi).
 * VITALIS_SAFETY_LAYER=off is accepted only in NODE_ENV=test and is marked in
 * the response so disabled safety cannot be mistaken for a normal result.
 */
import { Interceptor, InterceptorInterface, ExecutionContext, Injectable } from '@nitrostack/core';
import { rewriteBannedPhrases } from './banned-phrases.js';
import { detectEmergencyTerms } from './emergency-detection.guard.js';
import { env } from '../config/env.js';
import { getRequestHeaders } from './request-context.js';

export const DISCLAIMERS: Record<string, string> = {
  en: 'For informational purposes only. Not medical advice, diagnosis, or treatment. Always seek the advice of a physician or other qualified health provider.',
  es: 'Solo para fines informativos. No es un consejo médico, diagnóstico o tratamiento. Busque siempre el consejo de un médico u otro proveedor de salud calificado.',
  hi: 'केवल सूचनात्मक उद्देश्यों के लिए। यह चिकित्सीय सलाह, निदान या उपचार नहीं है। व्यक्तिगत स्वास्थ्य संबंधी प्रश्नों के लिए हमेशा डॉक्टर से परामर्श लें।',
};

const URGENCY_TIERS = new Set(['emergency', 'urgent', 'routine', 'self_care', 'not_applicable']);
const GUIDANCE_FIELDS = new Set([
  'guidance',
  'recommended_action',
  'recommendation',
  'advice',
  'next_steps',
  'action',
  'message',
]);
const EMERGENCY_GUIDANCE_PREFIX = '⚠️ EMERGENCY GUIDANCE:';

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function prependEmergencyGuidance(value: unknown, banner: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => prependEmergencyGuidance(item, banner));
  }
  if (!isRecord(value)) return value;

  const rewritten: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    if (GUIDANCE_FIELDS.has(key) && typeof item === 'string') {
      rewritten[key] = item.startsWith(EMERGENCY_GUIDANCE_PREFIX)
        ? item
        : `${banner}\n\n${item}`;
    } else {
      rewritten[key] = prependEmergencyGuidance(item, banner);
    }
  }
  return rewritten;
}

function markSafetyLayerDisabled(response: unknown, context: ExecutionContext): unknown {
  const marker = {
    disclaimer: 'Safety layer disabled for test-only execution. Do not use this output clinically.',
    disclaimer_lang: 'en',
    urgency_tier: 'not_applicable',
    red_flags_detected: [],
    synthetic_data: context.toolName?.startsWith('fhir_') || context.toolName?.startsWith('care_') || false,
    safety_layer: 'disabled',
    safety_layer_disabled: true,
  };

  if (isRecord(response)) {
    return {
      ...response,
      _safety: {
        ...(isRecord(response._safety) ? response._safety : {}),
        ...marker,
      },
    };
  }

  return { data: response, _safety: marker };
}

@Interceptor()
@Injectable()
export class ClinicalSafetyInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const response = await next();

    if (env.VITALIS_SAFETY_LAYER === 'off') {
      if (env.NODE_ENV === 'test') {
        (context as any).safety_layer = 'disabled';
        return markSafetyLayerDisabled(response, context);
      }

      // Production/development never silently bypass Layer 3. The bootstrap
      // warning is supplemented with a request-level warning and normal safety
      // processing continues.
      context.logger.error(
        'VITALIS_SAFETY_LAYER=off is test-only; ignoring the toggle outside NODE_ENV=test.',
      );
    }

    const rewrittenResponse = rewriteBannedPhrases(response);
    const responseObject = isRecord(rewrittenResponse)
      ? rewrittenResponse
      : { data: rewrittenResponse };
    const existingSafety = isRecord(responseObject._safety) ? responseObject._safety : {};

    const emergencyContext = (context as any).emergency ?? {};
    const preDetectedTerms = stringArray(emergencyContext.matched_terms);
    // NitroStack guards do not receive tool arguments. The gateway wrapper
    // records the post-pipe input on context.input; re-scan it here so the
    // actual MCP call still receives emergency escalation.
    const inputDetectedTerms = detectEmergencyTerms((context as any).input);
    const matchedEmergencyTerms = [...new Set([...preDetectedTerms, ...inputDetectedTerms])];
    (context as any).emergency = {
      ...emergencyContext,
      ruleset_available: true,
      matched_terms: matchedEmergencyTerms,
    };

    const existingUrgency = existingSafety.urgency_tier;
    let urgencyTier =
      typeof existingUrgency === 'string' && URGENCY_TIERS.has(existingUrgency)
        ? existingUrgency
        : 'not_applicable';
    const redFlagsDetected = [...new Set(stringArray(existingSafety.red_flags_detected))];

    if (matchedEmergencyTerms.length > 0) {
      urgencyTier = 'emergency';
      for (const term of matchedEmergencyTerms) {
        if (!redFlagsDetected.includes(term)) redFlagsDetected.push(term);
      }

      const banner =
        `${EMERGENCY_GUIDANCE_PREFIX} Severe symptom keywords detected (${matchedEmergencyTerms.join(', ')}). ` +
        'If this is an active emergency, call emergency services (911/112/108) immediately.';
      const guidedResponse = prependEmergencyGuidance(responseObject, banner);
      Object.assign(responseObject, guidedResponse);
    }

    const requestHeaders =
      (context as any).headers ?? (context as any).req?.headers ?? getRequestHeaders() ?? {};
    const metadata = (context.metadata ?? {}) as Record<string, any>;
    const requestedLanguage = String(
      requestHeaders['x-vitalis-lang'] ??
        requestHeaders['X-Vitalis-Lang'] ??
        metadata['x-vitalis-lang'] ??
        metadata.lang ??
        'en',
    ).toLowerCase();
    const language = DISCLAIMERS[requestedLanguage] ? requestedLanguage : 'en';

    const isFhirOrCare =
      context.toolName?.startsWith('fhir_') || context.toolName?.startsWith('care_');
    const syntheticData = isFhirOrCare ? true : existingSafety.synthetic_data === true;

    responseObject._safety = {
      disclaimer:
        typeof existingSafety.disclaimer === 'string' && existingSafety.disclaimer.trim().length > 0
          ? existingSafety.disclaimer
          : DISCLAIMERS[language],
      disclaimer_lang: language,
      urgency_tier: urgencyTier,
      red_flags_detected: redFlagsDetected,
      synthetic_data: syntheticData,
    };

    return responseObject;
  }
}
