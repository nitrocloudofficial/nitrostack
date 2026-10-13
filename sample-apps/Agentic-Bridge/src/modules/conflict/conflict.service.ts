/**
 * Conflict detection engine.
 *
 * Cross-references what the ticket tracker says against what humans actually
 * decided out loud, and raises a conflict when they disagree. See
 * SemanticService for why this needs two signals rather than cosine alone.
 */
import { Injectable } from '@nitrostack/core';
import { SemanticService } from '../../shared/services/semantic.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import type { Conflict, JiraSprint, MeetingTranscript } from '../../shared/schemas/index.js';

/**
 * Below this cosine, two statements nominally about the same ticket have drifted
 * apart in substance. This is the threshold the architecture document specifies.
 */
export const DRIFT_THRESHOLD = 0.7;

/** At or above this divergence, the two sources are making incompatible choices. */
export const CONTRADICTION_THRESHOLD = 0.6;

/**
 * Name the system a spoken decision came from, inferred from the transcript the
 * Scrum Analyst produced. A conflict ruling ends up in section 0 of CLAUDE.md
 * citing this, so "Microsoft Teams" on a Slack-sourced decision would be a
 * fabricated citation.
 */
function originOf(transcript: MeetingTranscript): string {
  const haystack = `${transcript.source} ${transcript.title}`.toLowerCase();
  if (haystack.includes('slack')) return 'Slack';
  if (haystack.includes('teams')) return 'Microsoft Teams';
  if (haystack.includes('discord')) return 'Discord';
  return 'Team chat';
}

@Injectable({ deps: [SemanticService, StoreService] })
export class ConflictService {
  constructor(
    private semantic: SemanticService,
    private store: StoreService
  ) {}

  detect(sprint: JiraSprint, transcript: MeetingTranscript): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const issue of sprint.issues) {
      if (/done|closed/i.test(issue.status)) continue;

      const ticketText = `${issue.summary}. ${issue.description}`;
      const ticketSignal = this.semantic.analyseDecision(ticketText);
      const ticketVec = this.semantic.embed(ticketText);

      // Only compare against utterances that are actually about this ticket's
      // subject matter — otherwise every unrelated remark scores as "drift".
      const relevant = transcript.decisions.filter(
        (d) => d.polarity !== 'neutral' && d.entities.some((e) => ticketSignal.entities.includes(e))
      );
      if (!relevant.length) continue;

      let best: { conflict: Conflict; score: number } | null = null;

      for (const decision of relevant) {
        const decisionSignal = {
          entities: decision.entities,
          polarity: decision.polarity,
          rejected: this.semantic.analyseDecision(decision.text).rejected,
          adopted: this.semantic.analyseDecision(decision.text).adopted,
        };

        const similarity = this.semantic.cosine(ticketVec, this.semantic.embed(decision.text));
        const { score: divergence, reason } = this.semantic.divergence(ticketSignal, decisionSignal);

        const isContradiction = divergence >= CONTRADICTION_THRESHOLD;
        const isDrift = !isContradiction && similarity < DRIFT_THRESHOLD && divergence > 0;
        if (!isContradiction && !isDrift) continue;

        const topic = [...new Set([...ticketSignal.entities, ...decision.entities])]
          .slice(0, 3)
          .join(', ');

        // The later, human-authoritative statement wins by default — but the
        // administrator always gets the final say through the widget.
        const meetingIsAuthoritative =
          decision.authority === 'lead' || decision.authority === 'ops' || decision.polarity === 'reject';

        const conflict: Conflict = {
          id: `conflict-${issue.key}-${decision.id}`,
          kind: isContradiction ? 'contradiction' : 'semantic-drift',
          topic: topic || issue.key,
          similarity: Number(similarity.toFixed(4)),
          divergence: Number(divergence.toFixed(4)),
          sourceA: {
            origin: 'Jira',
            ref: issue.key,
            text: `${issue.summary} — ${issue.description}`,
          },
          sourceB: {
            // Derived, not hardcoded: the spoken record comes from Slack when
            // that is configured and from the bundled Teams fixture otherwise,
            // and a ruling written into CLAUDE.md must cite the right system.
            origin: originOf(transcript),
            ref: `${transcript.title} ${decision.timestamp ?? ''} ${decision.speaker ?? ''}`.trim(),
            text: decision.text,
          },
          recommendation: meetingIsAuthoritative ? 'b' : 'a',
          recommendationReason: meetingIsAuthoritative
            ? `${reason}. The meeting statement is more recent and came from ${decision.authority === 'unknown' ? 'a participant' : `the ${decision.authority}`}, ` +
              `so it is treated as the later decision — confirm before it is written into the manifest.`
            : `${reason}. No authoritative override was detected in the meeting, so the ticket stands.`,
          status: 'open',
        };

        // One conflict per ticket: keep the sharpest disagreement.
        const score = divergence * 2 + (1 - similarity);
        if (!best || score > best.score) best = { conflict, score };
      }

      if (best) conflicts.push(best.conflict);
    }

    // Preserve resolutions across re-runs so a re-detect does not silently
    // discard a decision the administrator already made.
    const existing = this.store.all('conflicts');
    const merged = conflicts.map((c) => {
      const prior = existing.find((e) => e.id === c.id);
      return prior?.status === 'resolved' ? { ...c, status: prior.status, resolution: prior.resolution } : c;
    });

    this.store.replace('conflicts', merged);
    return merged;
  }

  resolve(
    conflictId: string,
    chosen: 'a' | 'b' | 'custom',
    directive: string | undefined,
    resolvedBy: string
  ): Conflict {
    const conflict = this.store.find('conflicts', conflictId);
    if (!conflict) {
      const open = this.store.all('conflicts').map((c) => c.id);
      throw new Error(
        `No conflict with id "${conflictId}".` +
          (open.length ? ` Known conflicts: ${open.join(', ')}` : ' Run detect_conflicts first.')
      );
    }

    if (chosen === 'custom' && !directive?.trim()) {
      throw new Error("chosen='custom' requires a non-empty `directive` to write into the manifest.");
    }

    const resolvedDirective =
      chosen === 'custom'
        ? directive!.trim()
        : chosen === 'a'
          ? `Authoritative: ${conflict.sourceA.origin} (${conflict.sourceA.ref}). ${conflict.sourceA.text}`
          : `Authoritative: ${conflict.sourceB.origin} (${conflict.sourceB.ref}). ${conflict.sourceB.text}`;

    const updated: Conflict = {
      ...conflict,
      status: 'resolved',
      resolution: {
        chosen,
        directive: resolvedDirective,
        resolvedBy,
        resolvedAt: new Date().toISOString(),
      },
    };

    this.store.upsert('conflicts', updated);

    // A resolved conflict becomes a first-class, top-weighted fact: it is a
    // validated human decision and must outrank anything the parsers inferred.
    this.store.addFacts([
      {
        id: `consensus:resolution:${conflict.id}`,
        agent: 'administrator',
        category: 'consensus',
        title: `Resolved conflict on ${conflict.topic}`,
        detail: resolvedDirective,
        evidence: [conflict.sourceA.ref, conflict.sourceB.ref],
        weight: 10,
      },
    ]);

    return updated;
  }

  openConflicts(): Conflict[] {
    return this.store.all('conflicts').filter((c) => c.status === 'open');
  }
}
