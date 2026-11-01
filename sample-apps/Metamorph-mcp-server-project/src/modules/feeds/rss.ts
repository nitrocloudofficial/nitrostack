// Tolerant RSS 2.0 / Atom reader. Feed text is untrusted data: it is never executed, never used as a URL to fetch,
// and every field is flattened, stripped of control characters and length-capped. No DTD or entity expansion.
import { cleanText } from '../intake/advisory.js';
import { FeedError } from './http.js';

export interface FeedItem {
  title: string;
  link: string;
  published?: string; // ISO 8601 when the feed date parses
  summary: string; // <= 300 characters
}

export const MAX_FEED_ITEMS = 50;
const MAX_TITLE = 200;
const MAX_SUMMARY = 300;
const MAX_LINK = 500;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,5});/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ' ';
    }
    return NAMED[e.toLowerCase()] ?? m; // unknown entities stay literal; nothing is expanded
  });
}

// Element text: CDATA is taken literally, plain text is entity-decoded.
function textOf(raw: string): string {
  let out = '';
  let last = 0;
  for (const m of raw.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)) {
    out += decodeEntities(raw.slice(last, m.index)) + m[1];
    last = (m.index ?? 0) + m[0].length;
  }
  return out + decodeEntities(raw.slice(last));
}

function stripMarkup(s: string): string {
  return s.replace(/<[^>]*>/g, ' ');
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? textOf(m[1]) : undefined;
}

function attr(el: string, name: string): string | undefined {
  const m = el.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  const v = m ? (m[1] ?? m[2]) : undefined;
  return v === undefined ? undefined : decodeEntities(v);
}

function safeLink(s: string | undefined): string {
  const v = (s ?? '').trim();
  if (v.length === 0 || v.length > MAX_LINK || !/^https?:\/\//i.test(v)) return '';
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

// Atom: the alternate link, else <content src>, else an <id> that is itself a URL. Enclosures are never used.
function atomLink(block: string): string | undefined {
  const links = block.match(/<link\b[^>]*>/gi) ?? [];
  const alt = links.find((l) => (attr(l, 'rel') ?? 'alternate') === 'alternate');
  if (alt) return attr(alt, 'href');
  const content = block.match(/<content\b[^>]*>/i);
  const src = content ? attr(content[0], 'src') : undefined;
  return src ?? tag(block, 'id');
}

function isoDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = Date.parse(s.trim());
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export function parseFeed(xml: string): FeedItem[] {
  if (typeof xml !== 'string') throw new FeedError('Feed is not text.');
  const doc = xml
    .replace(/^﻿/, '')
    .replace(/<!DOCTYPE[\s\S]*?(?:\]\s*>|>)/i, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const isAtom = /<feed[\s>]/i.test(doc) && /<\/feed\s*>/i.test(doc);
  const isRss = /<rss[\s>]/i.test(doc) && /<\/rss\s*>/i.test(doc);
  if (!isAtom && !isRss) throw new FeedError('Feed is not well-formed RSS or Atom.');

  const itemTag = isAtom ? 'entry' : 'item';
  const re = new RegExp(`<${itemTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${itemTag}>`, 'gi');
  const items: FeedItem[] = [];
  for (const m of doc.matchAll(re)) {
    if (items.length >= MAX_FEED_ITEMS) break;
    const b = m[1];
    const link = isAtom ? atomLink(b) : tag(b, 'link');
    const date = isAtom ? (tag(b, 'published') ?? tag(b, 'updated')) : (tag(b, 'pubDate') ?? tag(b, 'dc:date'));
    const body = isAtom ? (tag(b, 'summary') ?? tag(b, 'content')) : tag(b, 'description');
    items.push({
      title: cleanText(stripMarkup(tag(b, 'title') ?? ''), MAX_TITLE),
      link: safeLink(link),
      published: isoDate(date),
      summary: cleanText(stripMarkup(body ?? ''), MAX_SUMMARY)
    });
  }
  return items;
}
