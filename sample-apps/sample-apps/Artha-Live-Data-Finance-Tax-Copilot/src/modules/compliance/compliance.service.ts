import { Injectable } from '@nitrostack/core';
import {
    COMPLIANCE_EVENTS,
    ComplianceCategory,
    ComplianceEvent,
} from './compliance.data.js';

export interface UpcomingEvent extends ComplianceEvent {
    daysRemaining: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ComplianceService {
    private parseIso(iso: string): Date {
        return new Date(`${iso}T00:00:00Z`);
    }

    /** Whole days from `from` until the event's due date (negative if past). */
    private daysUntil(dueDate: string, from: Date): number {
        const diff = this.parseIso(dueDate).getTime() - from.getTime();
        return Math.ceil(diff / MS_PER_DAY);
    }

    /** All known compliance events, sorted by due date. */
    getAll(): ComplianceEvent[] {
        return [...COMPLIANCE_EVENTS].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    /** Filter by category. */
    getByCategory(category: ComplianceCategory): ComplianceEvent[] {
        return this.getAll().filter((e) => e.category === category);
    }

    /**
     * Deadlines that fall on/after `from`, sorted soonest-first, annotated with
     * days remaining. Optionally limit to those within `withinDays`.
     */
    getUpcoming(options: { from?: Date; withinDays?: number; limit?: number } = {}): UpcomingEvent[] {
        const from = options.from ?? new Date();
        // Normalize to UTC midnight so "days remaining" is stable.
        const fromMidnight = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

        let upcoming = this.getAll()
            .map((e) => ({ ...e, daysRemaining: this.daysUntil(e.dueDate, fromMidnight) }))
            .filter((e) => e.daysRemaining >= 0)
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

        if (options.withinDays !== undefined) {
            upcoming = upcoming.filter((e) => e.daysRemaining <= options.withinDays!);
        }
        if (options.limit !== undefined) {
            upcoming = upcoming.slice(0, options.limit);
        }
        return upcoming;
    }
}
