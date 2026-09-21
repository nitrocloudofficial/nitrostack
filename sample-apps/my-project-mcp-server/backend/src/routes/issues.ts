import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { store } from '../db/store';
import { asyncHandler } from '../utils/asyncHandler';
import { notFoundError } from '../utils/httpError';
import type { IssueReport, TimelineEvent } from '../types';

export const issuesRouter = Router({ mergeParams: true });

const createIssueSchema = z.object({
  issueType: z.string().trim().min(1, 'issueType is required'),
  description: z.string().trim().min(1, 'description is required'),
});

// GET /api/cases/:caseId/issues
issuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    if (!store.caseExists(caseId)) throw notFoundError(`No case with id "${caseId}"`);
    res.json(store.listIssues(caseId));
  })
);

// POST /api/cases/:caseId/issues
issuesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    if (!store.caseExists(caseId)) throw notFoundError(`No case with id "${caseId}"`);

    const input = createIssueSchema.parse(req.body);

    const issue: IssueReport = {
      id: crypto.randomUUID(),
      caseId,
      issueType: input.issueType,
      description: input.description,
      reportedAt: new Date().toISOString(),
      status: 'open',
    };
    store.addIssue(issue);

    const event: TimelineEvent = {
      timestamp: issue.reportedAt,
      actor: 'patient',
      event: `Reported an issue: ${input.issueType}.`,
    };
    store.appendTimelineEvent(caseId, event);

    res.status(201).json(issue);
  })
);
