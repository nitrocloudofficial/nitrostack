import type { BlackboardEntry } from '../knowledge/blackboard.js';

export interface Conflict {
  entryA: BlackboardEntry;
  entryB: BlackboardEntry;
  reason: string;
}

const OPPOSITE_PAIRS = [
  ['allow', 'deny'],
  ['enable', 'disable'],
  ['public', 'private'],
  ['encrypt', 'decrypt'],
  ['add', 'remove'],
  ['open', 'close'],
  ['increase', 'decrease'],
  ['accept', 'reject'],
];

export class ConflictResolver {
  detect(entries: BlackboardEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]!;
        const b = entries[j]!;
        if (a.agent === b.agent) continue;

        const reason = this.findConflict(a.content, b.content);
        if (reason) {
          conflicts.push({ entryA: a, entryB: b, reason });
        }
      }
    }

    return conflicts;
  }

  resolve(conflicts: Conflict[]): string[] {
    return conflicts.map(
      (c) =>
        `Conflict between ${c.entryA.agent} and ${c.entryB.agent}: ${c.reason}. ` +
        `Resolution: Both perspectives noted — ${c.entryA.content.slice(0, 100)} vs ${c.entryB.content.slice(0, 100)}`
    );
  }

  private findConflict(a: string, b: string): string | null {
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();

    for (const [wordA, wordB] of OPPOSITE_PAIRS) {
      if (
        (lowerA.includes(wordA!) && lowerB.includes(wordB!)) ||
        (lowerA.includes(wordB!) && lowerB.includes(wordA!))
      ) {
        return `Opposing stance: ${wordA} vs ${wordB}`;
      }
    }

    return null;
  }
}
