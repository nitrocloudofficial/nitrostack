import { Injectable } from '@nitrostack/core';
import { EventEmitter } from 'events';

export interface IssueEvent {
    id: string;
    status: 'detected' | 'analyzing' | 'ready' | 'approved' | 'rejected' | 'applied';
    service_name: string;
    error_description: string;
    commit_hash?: string;
    reason?: string;
    proposed_changes?: string;
    timestamp: number;
    severity: 'critical' | 'high' | 'medium';
}

@Injectable()
export class IssueEventService extends EventEmitter {
    private issues: Map<string, IssueEvent> = new Map();

    /**
     * Emit when an issue is first detected
     */
    emitIssueDetected(issue: Omit<IssueEvent, 'id' | 'status' | 'timestamp'>) {
        const issueEvent: IssueEvent = {
            ...issue,
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'detected',
            timestamp: Date.now()
        };
        this.issues.set(issueEvent.id, issueEvent);
        this.emit('issue:detected', issueEvent);
        return issueEvent;
    }

    /**
     * Emit when analysis is in progress
     */
    emitAnalyzing(issueId: string) {
        const issue = this.issues.get(issueId);
        if (issue) {
            issue.status = 'analyzing';
            this.emit('issue:analyzing', issue);
        }
    }

    /**
     * Emit when remediation is ready for approval
     */
    emitRemediationReady(issueId: string, proposedChanges: string, reason: string) {
        const issue = this.issues.get(issueId);
        if (issue) {
            issue.status = 'ready';
            issue.proposed_changes = proposedChanges;
            issue.reason = reason;
            this.emit('issue:ready', issue);
        }
    }

    /**
     * Record user approval
     */
    recordApproval(issueId: string) {
        const issue = this.issues.get(issueId);
        if (issue) {
            issue.status = 'approved';
            this.emit('issue:approved', issue);
        }
    }

    /**
     * Record user rejection
     */
    recordRejection(issueId: string) {
        const issue = this.issues.get(issueId);
        if (issue) {
            issue.status = 'rejected';
            this.emit('issue:rejected', issue);
        }
    }

    /**
     * Record remediation applied
     */
    recordApplied(issueId: string) {
        const issue = this.issues.get(issueId);
        if (issue) {
            issue.status = 'applied';
            this.emit('issue:applied', issue);
        }
    }

    /**
     * Get issue by ID
     */
    getIssue(issueId: string): IssueEvent | undefined {
        return this.issues.get(issueId);
    }

    /**
     * Get all issues
     */
    getAllIssues(): IssueEvent[] {
        return Array.from(this.issues.values());
    }

    /**
     * Get active issues (not yet applied or rejected)
     */
    getActiveIssues(): IssueEvent[] {
        return Array.from(this.issues.values()).filter(
            issue => !['applied', 'rejected'].includes(issue.status)
        );
    }
}
