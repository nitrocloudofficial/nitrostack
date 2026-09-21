'use server';

import {
  reconcileCase as callReconcileCase,
  policyDecoder as callPolicyDecoder,
  listCityProcedures as callListCityProcedures,
} from '@/lib/mcp-client';
import type {
  ReconcileCaseInput,
  ReconcileCaseResult,
  PolicyDecoderResult,
  CityProcedure,
} from '@/lib/types';

export async function fetchReconcileCase(
  input: ReconcileCaseInput
): Promise<{ data?: ReconcileCaseResult; error?: string }> {
  try {
    const data = await callReconcileCase(input);
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach Care Mediator backend';
    return { error: message };
  }
}

export async function fetchPolicyDecoder(
  policyText: string,
  hospitalId?: string
): Promise<{ data?: PolicyDecoderResult; error?: string }> {
  try {
    const data = await callPolicyDecoder(policyText, hospitalId);
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to decode policy';
    return { error: message };
  }
}

export async function fetchCityProcedures(
  city: string
): Promise<{ data?: CityProcedure[]; error?: string }> {
  try {
    const data = await callListCityProcedures(city);
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list city procedures';
    return { error: message };
  }
}
