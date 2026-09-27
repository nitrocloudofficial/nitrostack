import { Injectable, OnModuleInit } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Quartile Lookup Service
 *
 * Maps venue names to SJR/Scimago quartiles using a static CSV file.
 * Data should be downloaded from Scimago and placed in data/scimago-quartiles.csv
 */
@Injectable()
export class QuartileLookupService implements OnModuleInit {
  private quartiles = new Map<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'>();
  private dataPath: string;

  constructor() {
    this.dataPath = path.resolve(process.cwd(), 'data', 'scimago-quartiles.csv');
  }

  onModuleInit(): void {
    this.loadQuartiles();
  }

  /**
   * Load quartile mapping from CSV
   */
  private loadQuartiles(): void {
    if (!fs.existsSync(this.dataPath)) {
      console.warn('[QuartileLookup] Quartile CSV not found at', this.dataPath);
      console.warn('[QuartileLookup] Download from https://www.scimagojr.com/journalrank.php');
      this.populateDefaults();
      return;
    }

    try {
      const content = fs.readFileSync(this.dataPath, 'utf-8');
      const lines = content.split('\n').slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;
        const [title, , , , , , , quartile] = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (title && quartile && ['Q1', 'Q2', 'Q3', 'Q4'].includes(quartile)) {
          this.quartiles.set(title.toLowerCase(), quartile as 'Q1' | 'Q2' | 'Q3' | 'Q4');
        }
      }

      console.log(`[QuartileLookup] Loaded ${this.quartiles.size} venue quartiles`);
    } catch (error) {
      console.error('[QuartileLookup] Failed to load quartiles:', error);
      this.populateDefaults();
    }
  }

  /**
   * Populate with common CS venues as fallback
   */
  private populateDefaults(): void {
    const defaults: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
      // Top CS conferences
      'neurips': 'Q1', 'icml': 'Q1', 'iclr': 'Q1', 'aaai': 'Q1', 'ijcai': 'Q1',
      'cvpr': 'Q1', 'iccv': 'Q1', 'eccv': 'Q1', 'siggraph': 'Q1', 'sigcomm': 'Q1',
      'osdi': 'Q1', 'sosp': 'Q1', 'asplos': 'Q1', 'isca': 'Q1', 'hpca': 'Q1',
      'icse': 'Q1', 'fse': 'Q1', 'ase': 'Q1', 'oopsla': 'Q1', 'pldi': 'Q1', 'popl': 'Q1',
      'vldb': 'Q1', 'sigmod': 'Q1', 'icde': 'Q1', 'cidr': 'Q1',
      'ndss': 'Q1', 'uss': 'Q1', 'security': 'Q1', 'ccs': 'Q1',
      'mobicom': 'Q1', 'mobisys': 'Q1', 'conext': 'Q1',
      // Top journals
      'nature': 'Q1', 'science': 'Q1', 'cell': 'Q1', 'pnas': 'Q1',
      'ieee transactions': 'Q1', 'acm transactions': 'Q1',

      // Q2 venues
      'icassp': 'Q2', 'icip': 'Q2', 'interspeech': 'Q2', 'emnlp': 'Q2', 'acl': 'Q2',
      'naacl': 'Q2', 'coling': 'Q2', 'eacl': 'Q2',
      'icra': 'Q2', 'iros': 'Q2', 'rss': 'Q2', 'corl': 'Q2',
      'dtc': 'Q2', 'date': 'Q2', 'dac': 'Q2', 'iccad': 'Q2',
      'ics': 'Q2', 'sc': 'Q2', 'supercomputing': 'Q2',
      'eurosys': 'Q2', 'atc': 'Q2', 'fast': 'Q2', 'nsdi': 'Q2',
      'oakland': 'Q2', 'sp': 'Q2', 'crypto': 'Q2', 'eurocrypt': 'Q2',
      'sigmetrics': 'Q2', 'performance': 'Q2', 'imc': 'Q2',
      'infocom': 'Q2', 'mobihoc': 'Q2',

      // Q3 venues
      'access': 'Q3', 'electronics': 'Q3', 'sensors': 'Q3', 'applied sciences': 'Q3',
      'information': 'Q3', 'algorithms': 'Q3', 'mathematics': 'Q3',
      'jmlr': 'Q3', 'jair': 'Q3', 'tpami': 'Q3', 'tc': 'Q3', 'tocs': 'Q3',
    };

    for (const [venue, quartile] of Object.entries(defaults)) {
      this.quartiles.set(venue.toLowerCase(), quartile);
    }

    console.log(`[QuartileLookup] Loaded ${this.quartiles.size} default venue quartiles`);
  }

  /**
   * Look up quartile for a venue name
   */
  lookup(venueName: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'unknown' {
    if (!venueName) return 'unknown';

    const normalized = venueName.toLowerCase().trim();

    // Exact match
    if (this.quartiles.has(normalized)) {
      return this.quartiles.get(normalized)!;
    }

    // Partial match (e.g., "IEEE Transactions on Pattern Analysis" -> "ieee transactions")
    for (const [key, value] of this.quartiles.entries()) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Abbreviation matching
    const abbreviations: Record<string, string> = {
      'cvpr': 'cvpr',
      'iccv': 'iccv',
      'eccv': 'eccv',
      'neurips': 'neurips',
      'icml': 'icml',
      'iclr': 'iclr',
      'aaai': 'aaai',
      'ijcai': 'ijcai',
      'siggraph': 'siggraph',
      'sigcomm': 'sigcomm',
      'osdi': 'osdi',
      'sosp': 'sosp',
      'asplos': 'asplos',
      'isca': 'isca',
      'hpca': 'hpca',
      'icse': 'icse',
      'fse': 'fse',
      'ase': 'ase',
      'vldb': 'vldb',
      'sigmod': 'sigmod',
      'icde': 'icde',
      'cidr': 'cidr',
      'ndss': 'ndss',
      'uss': 'uss',
      'ccs': 'ccs',
      'mobicom': 'mobicom',
      'mobisys': 'mobisys',
      'conext': 'conext',
      'infocom': 'infocom',
    };

    for (const [abbr, key] of Object.entries(abbreviations)) {
      if (normalized.includes(abbr) && this.quartiles.has(key)) {
        return this.quartiles.get(key)!;
      }
    }

    return 'unknown';
  }

  /**
   * Get all loaded quartiles (for debugging)
   */
  getAll(): Map<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> {
    return new Map(this.quartiles);
  }

  /**
   * Reload from disk
   */
  reload(): void {
    this.quartiles.clear();
    this.loadQuartiles();
  }
}