import { Router } from 'express';
import { z } from 'zod';
import { store, type InternalCaseRecord } from '../db/store';
import { generateCaseId } from '../domain/caseId';
import { checkAgainstPolicyTerms } from '../domain/policyRules';
import { runObjectivityCheck } from '../domain/objectivityCheck';
import { generateLoanOffers } from '../domain/loanOffers';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequestError, notFoundError } from '../utils/httpError';
import type { TimelineEvent } from '../types';

export const casesRouter = Router();

// --- Schemas ---

const createCaseSchema = z.object({
  patientName: z.string().trim().min(1, 'Patient name is required'),
  hospitalName: z.string().trim().min(1, 'Hospital name is required'),
  procedure: z.string().trim().min(1, 'Procedure is required'),
  patientHistory: z.string().trim().optional().default(''),
  insuranceProvider: z.string().trim().min(1, 'Insurance provider is required'),
  estimatedCost: z.coerce.number().positive('Estimated cost must be greater than 0'),
});

const decisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('partial'),
    approvedAmount: z.coerce.number().nonnegative(),
    note: z.string().trim().optional(),
  }),
  z.object({ action: z.literal('deny'), note: z.string().trim().min(1, 'A denial reason is required') }),
  z.object({ action: z.literal('more-info'), note: z.string().trim().min(1, 'Specify what info is needed') }),
]);

// --- Routes ---

// GET /api/cases
casesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(store.listCases());
  })
);

// GET /api/cases/:caseId
casesRouter.get(
  '/:caseId',
  asyncHandler(async (req, res) => {
    const caseData = store.getCase(req.params.caseId);
    if (!caseData) throw notFoundError(`No case with id "${req.params.caseId}"`);
    res.json(caseData);
  })
);

// POST /api/cases — hospital submits a new case
casesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createCaseSchema.parse(req.body);
    const caseId = generateCaseId();
    const now = Date.now();

    const consentEvent: TimelineEvent = {
      timestamp: new Date(now).toISOString(),
      actor: 'patient',
      event: `Patient authorised sharing this case with ${input.insuranceProvider}.`,
    };
    const submittedEvent: TimelineEvent = {
      timestamp: new Date(now + 60_000).toISOString(),
      actor: 'hospital',
      event: 'Case submitted with patient history and cost estimate.',
    };

    const coverageExplainer = checkAgainstPolicyTerms(input.insuranceProvider, input.patientHistory);

    const record: InternalCaseRecord = {
      caseId,
      patientName: input.patientName,
      hospitalName: input.hospitalName,
      procedure: input.procedure,
      submittedAt: consentEvent.timestamp,

      hospitalEstimate: input.estimatedCost,
      insurerApproved: 0,
      gap: input.estimatedCost,
      claimStatus: 'pending',

      objectivityReport: {
        summary: 'Objectivity check queued — results will appear once complete.',
        flags: [],
      },
      coverageExplainer,

      loanOffers: [],
      recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 0 },

      timeline: [consentEvent, submittedEvent],
      patientHistory: input.patientHistory,
    };

    const created = store.createCase(record);
    res.status(201).json(created);
  })
);

// POST /api/cases/:caseId/objectivity-check — runs (or re-runs) the rule-based check
casesRouter.post(
  '/:caseId/objectivity-check',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const current = store.getInternalCase(caseId);
    if (!current) throw notFoundError(`No case with id "${caseId}"`);

    const report = runObjectivityCheck({
      procedure: current.procedure,
      estimatedCost: current.hospitalEstimate,
      patientHistory: current.patientHistory ?? '',
    });

    const event: TimelineEvent = {
      timestamp: new Date().toISOString(),
      actor: 'system',
      event:
        report.flags.length === 0
          ? 'Objectivity check completed — no inconsistencies found.'
          : `Objectivity check flagged ${report.flags.length} issue${report.flags.length > 1 ? 's' : ''}: ${report.flags.join(' ')}`,
    };

    const updated = store.updateCase(caseId, (c) => ({
      ...c,
      objectivityReport: report,
      timeline: [...c.timeline, event],
    }));

    res.json(updated);
  })
);

// POST /api/cases/:caseId/decision — insurer takes action
casesRouter.post(
  '/:caseId/decision',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const current = store.getCase(caseId);
    if (!current) throw notFoundError(`No case with id "${caseId}"`);

    const decision = decisionSchema.parse(req.body);
    const timestamp = new Date().toISOString();
    const events: TimelineEvent[] = [];

    let insurerApproved = current.insurerApproved;
    let gap = current.gap;
    let claimStatus = current.claimStatus;
    let denialReason = current.denialReason;

    if (decision.action === 'approve') {
      insurerApproved = current.hospitalEstimate;
      gap = 0;
      claimStatus = 'approved';
      denialReason = undefined;
      events.push({ timestamp, actor: 'insurer', event: 'Insurer approved the claim in full.' });
    } else if (decision.action === 'partial') {
      if (decision.approvedAmount > current.hospitalEstimate) {
        throw badRequestError('approvedAmount cannot exceed the hospital estimate');
      }
      insurerApproved = decision.approvedAmount;
      gap = current.hospitalEstimate - decision.approvedAmount;
      claimStatus = 'partial';
      denialReason = decision.note;
      events.push({
        timestamp,
        actor: 'insurer',
        event: `Insurer partially approved the claim.${decision.note ? ` Note: "${decision.note}"` : ''}`,
      });
    } else if (decision.action === 'deny') {
      insurerApproved = 0;
      gap = current.hospitalEstimate;
      claimStatus = 'denied';
      denialReason = decision.note;
      events.push({ timestamp, actor: 'insurer', event: `Insurer denied the claim. Reason: "${decision.note}"` });
    } else {
      claimStatus = 'more-info-requested';
      events.push({
        timestamp,
        actor: 'insurer',
        event: `Insurer requested additional information. Note: "${decision.note}"`,
      });
    }

    let loanOffers = current.loanOffers;
    let recommendedOffer = current.recommendedOffer;

    if (decision.action === 'approve' || decision.action === 'partial') {
      const generated = generateLoanOffers(gap);
      loanOffers = generated.loanOffers;
      recommendedOffer = generated.recommendedOffer;

      if (gap > 0) {
        events.push({
          timestamp: new Date(Date.parse(timestamp) + 60_000).toISOString(),
          actor: 'system',
          event: 'Financing options generated to cover the remaining gap.',
        });
        if (loanOffers.some((o) => o.flagged)) {
          events.push({
            timestamp: new Date(Date.parse(timestamp) + 120_000).toISOString(),
            actor: 'system',
            event: 'One financing offer flagged for predatory APR.',
          });
        }
      }
    }

    const updated = store.updateCase(caseId, (c) => ({
      ...c,
      insurerApproved,
      gap,
      claimStatus,
      denialReason,
      loanOffers,
      recommendedOffer,
      timeline: [...c.timeline, ...events],
    }));

    res.json(updated);
  })
);
