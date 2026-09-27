/**
 * calendar.impl.ts — Finnhub API calls for earnings + economic events.
 * Falls back gracefully when FINNHUB_KEY is not set.
 */
import axios from 'axios';
import type { CalendarEvent } from '../video-ingest/video.types.js';

function windowDates(centerDate: string, daysBefore = 7, daysAfter = 7): { from: string; to: string } {
  const center = new Date(centerDate);
  const from   = new Date(center); from.setDate(from.getDate() - daysBefore);
  const to     = new Date(center); to.setDate(to.getDate() + daysAfter);
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  };
}

export async function fetchEarningsEvents(ticker: string, centerDate: string, finnhubKey: string): Promise<CalendarEvent[]> {
  if (!finnhubKey) return [];
  const { from, to } = windowDates(centerDate);
  try {
    const r = await axios.get('https://finnhub.io/api/v1/calendar/earnings', {
      params: { symbol: ticker, from, to, token: finnhubKey },
      timeout: 6_000,
    });
    return (r.data?.earningsCalendar ?? []).map((e: any) => ({
      type:        'earnings' as const,
      date:        e.date,
      source:      'finnhub',
      description: `${ticker} earnings — EPS estimate: ${e.epsEstimate ?? 'N/A'}, Revenue estimate: ${e.revenueEstimate ?? 'N/A'}`,
    }));
  } catch { return []; }
}

export async function fetchEconomicEvents(centerDate: string, finnhubKey: string): Promise<CalendarEvent[]> {
  if (!finnhubKey) return [];
  const { from, to } = windowDates(centerDate);
  try {
    const r = await axios.get('https://finnhub.io/api/v1/calendar/economic', {
      params: { from, to, token: finnhubKey },
      timeout: 6_000,
    });
    return (r.data?.economicCalendar ?? [])
      .filter((e: any) => e.country === 'US' && e.impact === 'high')
      .map((e: any): CalendarEvent => {
        const name = (e.event as string).toLowerCase();
        const type = name.includes('fed') || name.includes('fomc') ? 'fed_meeting'
                   : name.includes('cpi') || name.includes('inflation') ? 'cpi'
                   : 'other';
        return { type, date: e.time?.split('T')[0] ?? centerDate, source: 'finnhub_economic', description: e.event };
      });
  } catch { return []; }
}

// Scan company news for conference/keynote/launch keywords — signals a catalyst
export async function detectNewsEvents(ticker: string, centerDate: string, finnhubKey: string): Promise<CalendarEvent[]> {
  if (!finnhubKey) return [];
  const { from, to } = windowDates(centerDate, 3, 3);
  const KEYWORDS = ['keynote', 'conference', 'summit', 'launch', 'reveal', 'announce', 'event', 'presentation'];
  try {
    const r = await axios.get('https://finnhub.io/api/v1/company-news', {
      params: { symbol: ticker, from, to, token: finnhubKey },
      timeout: 6_000,
    });
    const articles: any[] = r.data ?? [];
    const matching = articles.filter(a =>
      KEYWORDS.some(kw => (a.headline ?? '').toLowerCase().includes(kw))
    );
    return matching.slice(0, 3).map(a => ({
      type:        'conference' as const,
      date:        new Date(a.datetime * 1000).toISOString().split('T')[0],
      source:      'finnhub',
      description: a.headline,
    }));
  } catch { return []; }
}
