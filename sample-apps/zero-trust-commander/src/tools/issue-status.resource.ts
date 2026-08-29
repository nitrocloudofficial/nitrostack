import { Injectable, Inject, z, ExecutionContext, ResourceDecorator as Resource, ControllerDecorator as Controller } from '@nitrostack/core';
import { IssueEventService, IssueEvent } from '../services/issue-event.service.js';

@Controller()
@Injectable({ deps: [IssueEventService] })
export class IssueStatusResource {
    constructor(private issueEventService: IssueEventService) {}

    @Resource({
        uri: 'app://issues/current',
        name: 'current_issue',
        description: 'Get the current active issue that requires approval',
        mimeType: 'application/json'
    })
    async getCurrentIssue(ctx: ExecutionContext) {
        const activeIssues = this.issueEventService.getActiveIssues();
        
        // Return the most recent active issue
        if (activeIssues.length > 0) {
            return activeIssues[activeIssues.length - 1];
        }
        
        return null;
    }

    @Resource({
        uri: 'app://issues/all',
        name: 'all_issues',
        description: 'Get all issues (detected, analyzing, ready, approved, rejected, applied)',
        mimeType: 'application/json'
    })
    async getAllIssues(ctx: ExecutionContext) {
        return this.issueEventService.getAllIssues();
    }

    @Resource({
        uri: 'app://issues/active',
        name: 'active_issues',
        description: 'Get all active issues that are not yet applied or rejected',
        mimeType: 'application/json'
    })
    async getActiveIssues(ctx: ExecutionContext) {
        return this.issueEventService.getActiveIssues();
    }
}
