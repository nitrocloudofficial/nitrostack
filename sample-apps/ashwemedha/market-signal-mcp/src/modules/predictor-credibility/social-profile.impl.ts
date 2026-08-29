/**
 * social-profile.impl.ts — Fetch profile stats from Twitter/X and YouTube.
 * Degrades gracefully when API keys are missing.
 */
import axios from 'axios';

export interface ProfileStats {
  display_name?:    string;
  follower_count?:  number;
  account_age_years?: number;
  verified?:        boolean;
  platform_user_id?: string;
}

export async function fetchTwitterProfile(handle: string, bearerToken: string): Promise<ProfileStats> {
  if (!bearerToken) return {};
  const cleanHandle = handle.replace('@', '');
  try {
    const r = await axios.get(
      `https://api.twitter.com/2/users/by/username/${cleanHandle}`,
      {
        params: { 'user.fields': 'public_metrics,created_at,verified,name' },
        headers: { Authorization: `Bearer ${bearerToken}` },
        timeout: 8_000,
      }
    );
    const user = r.data?.data;
    if (!user) return {};
    const createdAt = new Date(user.created_at ?? Date.now());
    const ageYears  = (Date.now() - createdAt.getTime()) / (365.25 * 24 * 3600 * 1000);
    return {
      display_name:     user.name,
      follower_count:   user.public_metrics?.followers_count,
      account_age_years: Math.round(ageYears * 10) / 10,
      verified:         user.verified ?? false,
      platform_user_id: user.id,
    };
  } catch { return {}; }
}

export async function fetchTwitterRecentPosts(userId: string, bearerToken: string, limit = 50): Promise<string[]> {
  if (!bearerToken || !userId) return [];
  try {
    const r = await axios.get(
      `https://api.twitter.com/2/users/${userId}/tweets`,
      {
        params: { max_results: Math.min(limit, 100), 'tweet.fields': 'created_at,text' },
        headers: { Authorization: `Bearer ${bearerToken}` },
        timeout: 8_000,
      }
    );
    return (r.data?.data ?? []).map((t: any) => t.text as string);
  } catch { return []; }
}

export async function fetchYouTubeProfile(handle: string, ytKey: string): Promise<ProfileStats & { channel_id?: string }> {
  if (!ytKey) return {};
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  try {
    const r = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { forHandle: cleanHandle, part: 'snippet,statistics', key: ytKey },
      timeout: 8_000,
    });
    const channel = r.data?.items?.[0];
    if (!channel) return {};
    const publishedAt = new Date(channel.snippet?.publishedAt ?? Date.now());
    const ageYears    = (Date.now() - publishedAt.getTime()) / (365.25 * 24 * 3600 * 1000);
    return {
      display_name:      channel.snippet?.title,
      follower_count:    parseInt(channel.statistics?.subscriberCount ?? '0', 10),
      account_age_years: Math.round(ageYears * 10) / 10,
      verified:          channel.status?.isLinked ?? false,
      channel_id:        channel.id,
    };
  } catch { return {}; }
}

export async function fetchYouTubeRecentVideoTitles(channelId: string, ytKey: string, limit = 20): Promise<string[]> {
  if (!ytKey || !channelId) return [];
  try {
    const r = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: { channelId, type: 'video', part: 'snippet', maxResults: limit, order: 'date', key: ytKey },
      timeout: 8_000,
    });
    return (r.data?.items ?? []).map((v: any) => `${v.snippet?.title ?? ''} ${v.snippet?.description ?? ''}`.slice(0, 200));
  } catch { return []; }
}
