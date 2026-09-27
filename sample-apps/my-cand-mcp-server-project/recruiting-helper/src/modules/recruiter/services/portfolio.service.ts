import axios from 'axios';
import * as cheerio from 'cheerio';
import { RawCandidateData } from '../models/candidate.js';

export class PortfolioService {
  /**
   * Robustly scrapes a portfolio website for contact details, social links, bio, and publications.
   * Handles static metadata and uses regex search to extract links from Single Page Applications (Vite/React).
   */
  async fetchPortfolio(url: string): Promise<RawCandidateData | null> {
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      const response = await axios.get(normalizedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 1. Extract metadata (H1, Page Title, and OpenGraph/SEO tags)
      const title = $('title').text().trim();
      const h1 = $('h1').first().text().trim();
      const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || '';
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const firstParagraph = $('p').first().text().trim();

      const name = ogTitle || h1 || title.replace(/portfolio/i, '').replace(/home/i, '').replace(/[|:-]/g, '').trim();
      const bio = ogDescription || metaDescription || firstParagraph;

      // 2. Email extraction (mailto + regex search)
      const emailLink = $('a[href^="mailto:"]').first().attr('href');
      let email = emailLink ? emailLink.replace('mailto:', '').trim() : undefined;
      
      if (!email) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = html.match(emailRegex) || [];
        if (emailMatches.length > 0) {
          email = emailMatches[0].trim();
        }
      }

      // 3. Social & Presence link extraction (HTML search + raw text regex for React/SPA hydration)
      const links: string[] = [normalizedUrl];
      
      // Standard anchor tag search
      $('a[href*="linkedin.com"], a[href*="github.com"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const stdHref = href.trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://');
          if (!links.includes(stdHref)) {
            links.push(stdHref);
          }
        }
      });

      // Regex search across raw HTML (covers links inside dynamic React scripts)
      const socialRegex = /https?:\/\/(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[a-zA-Z0-9-_\/%]+/gi;
      const rawMatches = html.match(socialRegex) || [];
      for (const match of rawMatches) {
        const stdMatch = match.trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://');
        if (!links.includes(stdMatch)) {
          links.push(stdMatch);
        }
      }

      // 4. Extract publications (Cheerio search + regex search)
      const publications: any[] = [];
      
      // Anchor link search
      $('a[href*="doi.org"], a[href*="researchgate.net"], a[href*="arxiv.org"], a[href*="scholar.google"]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href) {
          publications.push({
            title: text || 'Research Link / Publication',
            url: href.trim()
          });
        }
      });

      // Text keywords search
      $('li, p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes('published in') || text.toLowerCase().includes('journal of') || text.toLowerCase().includes('doi:')) {
          if (text.length > 20 && text.length < 250 && !publications.some(p => p.title === text)) {
            publications.push({ title: text });
          }
        }
      });

      // Raw text regex search for publication links
      const pubLinksRegex = /https?:\/\/(?:www\.)?(?:doi\.org|researchgate\.net|arxiv\.org|scholar\.google)[a-zA-Z0-9-_\/%#?=&.]+/gi;
      const rawPubMatches = html.match(pubLinksRegex) || [];
      for (const href of rawPubMatches) {
        if (!publications.some(p => p.url === href)) {
          publications.push({
            title: 'Research Link / Publication',
            url: href.trim()
          });
        }
      }

      return {
        source: 'portfolio',
        tier: 'C',
        name: name || 'Portfolio Candidate',
        bio: bio || undefined,
        email,
        links,
        publications
      };
    } catch (error: any) {
      console.error(`Error scraping portfolio ${url}:`, error.message);
      return null;
    }
  }
}
