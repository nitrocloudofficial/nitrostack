import { getSupabaseClient } from './supabase.service.js';

export function calculateTrustScore(metrics: {
  fulfillment_rate: number;
  response_time_hours: number;
  kyc_verified: boolean;
  completed_deals: number;
  dispute_rate: number;
  platform_age_days: number;
}): number {
  let score = 50;

  score += metrics.fulfillment_rate * 20;
  score -= Math.min(metrics.response_time_hours * 2, 15);
  score += metrics.kyc_verified ? 15 : 0;
  score += Math.min(metrics.completed_deals * 2, 15);
  score -= metrics.dispute_rate * 25;
  score += Math.min(metrics.platform_age_days / 30, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function computeAndUpdateTrustScore(factoryId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { data: factory } = await supabase
    .from('factories')
    .select('created_at, gstin')
    .eq('id', factoryId)
    .single();

  const { count: completedDeals } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('factory_id', factoryId)
    .eq('status', 'sold');

  const totalDeals = completedDeals || 0;
  const platformAgeDays = factory
    ? Math.max(1, (Date.now() - new Date(factory.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const score = calculateTrustScore({
    fulfillment_rate: 0.9,
    response_time_hours: 4,
    kyc_verified: !!factory?.gstin,
    completed_deals: totalDeals,
    dispute_rate: 0,
    platform_age_days: platformAgeDays,
  });

  await supabase
    .from('factories')
    .update({ trust_score: score })
    .eq('id', factoryId);

  return score;
}

export function getTrustBadge(score: number): { badge: string; color: string } {
  if (score >= 90) return { badge: 'Verified — Top Rated', color: '#16a34a' };
  if (score >= 75) return { badge: 'Verified — Trusted', color: '#2563eb' };
  if (score >= 50) return { badge: 'Verified', color: '#6b7280' };
  return { badge: 'Unverified — New', color: '#9ca3af' };
}
