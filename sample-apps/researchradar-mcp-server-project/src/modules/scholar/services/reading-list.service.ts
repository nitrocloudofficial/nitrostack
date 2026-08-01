import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export interface SavedPaper {
  paperId: string;
  title: string;
  year: number | null;
  citationCount: number | null;
  note: string | null;                         // Personal annotation
  savedAt: Date;                               // Timestamp
  commercializationPotential?: string | null;  // Filled by commercialize_research tool
}

@Injectable({ deps: [] })
export class ReadingListService {
  private store: Map<string, SavedPaper> = new Map();
  private readonly filePath = path.join(process.cwd(), 'reading-list.json');

  constructor() {
    this.loadFromDisk();
  }

  /**
   * Load saved reading list from disk on startup.
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data: SavedPaper[] = JSON.parse(raw);
        data.forEach((p) => {
          this.store.set(p.paperId, {
            ...p,
            savedAt: new Date(p.savedAt),
          });
        });
      }
    } catch {
      // Ignore load error on fresh start
    }
  }

  /**
   * Persist current reading list state to disk.
   */
  private saveToDisk(): void {
    try {
      const papers = Array.from(this.store.values());
      fs.writeFileSync(this.filePath, JSON.stringify(papers, null, 2), 'utf-8');
    } catch {
      // Ignore write error
    }
  }

  /**
   * Save a paper to the reading list. Overwrites if already exists.
   */
  savePaper(paper: Omit<SavedPaper, 'savedAt'>): SavedPaper {
    const entry: SavedPaper = {
      ...paper,
      savedAt: new Date(),
    };
    this.store.set(paper.paperId, entry);
    this.saveToDisk();
    return entry;
  }

  /**
   * Remove a paper from the reading list by paperId.
   * Returns true if the paper existed and was removed, false otherwise.
   */
  removePaper(paperId: string): boolean {
    const deleted = this.store.delete(paperId);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  /**
   * Get all saved papers, sorted by savedAt descending (newest first).
   */
  getAll(): SavedPaper[] {
    return Array.from(this.store.values()).sort(
      (a, b) => b.savedAt.getTime() - a.savedAt.getTime()
    );
  }

  /**
   * Get a single saved paper by paperId, or undefined if not found.
   */
  getPaper(paperId: string): SavedPaper | undefined {
    return this.store.get(paperId);
  }

  /**
   * Attach a commercialization note to a saved paper.
   * Returns true if the paper was found and updated, false otherwise.
   */
  attachCommercializationNote(paperId: string, note: string): boolean {
    const paper = this.store.get(paperId);
    if (!paper) return false;
    paper.commercializationPotential = note;
    this.saveToDisk();
    return true;
  }

  /**
   * Returns the total number of saved papers.
   */
  count(): number {
    return this.store.size;
  }

  /**
   * Returns the reading list as a formatted Markdown string.
   */
  toMarkdown(): string {
    const papers = this.getAll();

    if (papers.length === 0) {
      return '# Reading List (0 papers)\n\n*No papers saved yet. Use `save_to_reading_list` to bookmark papers.*';
    }

    const lines: string[] = [`# Reading List (${papers.length} paper${papers.length === 1 ? '' : 's'})`];

    papers.forEach((paper, index) => {
      lines.push('');
      lines.push(`## ${index + 1}. ${paper.title}`);
      if (paper.year !== null) {
        lines.push(`- **Year:** ${paper.year}`);
      }
      if (paper.citationCount !== null) {
        lines.push(`- **Citations:** ${paper.citationCount}`);
      }
      lines.push(`- **Paper ID:** \`${paper.paperId}\``);

      const savedDate = paper.savedAt.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(`- **Saved:** ${savedDate}`);

      if (paper.note) {
        lines.push(`- **Note:** ${paper.note}`);
      }
      if (paper.commercializationPotential) {
        lines.push(`- **Commercialization Potential:** ${paper.commercializationPotential}`);
      }
    });

    return lines.join('\n');
  }
}

// Singleton instance exported for convenience
export const readingListService = new ReadingListService();
