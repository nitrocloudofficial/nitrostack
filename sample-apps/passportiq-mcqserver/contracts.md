# PassportIQ Shared Contracts

These contracts are non-negotiable integration boundaries between OCR, duplicate detection, risk scoring, backend pipeline tools, and the frontend timeline.

All teams should treat these shapes as stable unless a coordinated contract change is agreed in writing.

## 1. Seed Applicant JSON Schema

This is the shared applicant seed object produced by `ocr_extract` and consumed by Backend B's duplicate-detection flow.

```ts
import { z } from "zod";

export const SeedApplicantSchema = z.object({
  applicationId: z.string().min(1),
  applicantId: z.string().min(1).optional(),

  fullName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().min(1).optional(),

  passport: z.object({
    number: z.string().min(1),
    issuingCountry: z.string().min(1),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),

  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
  }).optional(),

  extractedFrom: z.object({
    documentId: z.string().min(1),
    source: z.enum(["passport", "visa", "application_form", "other"]),
    extractedAt: z.string().datetime(),
  }),
});

export type SeedApplicant = z.infer<typeof SeedApplicantSchema>;
```

Required JSON shape:

```json
{
  "applicationId": "app_123",
  "fullName": "Example Applicant",
  "dateOfBirth": "1990-01-31",
  "nationality": "IN",
  "passport": {
    "number": "P1234567",
    "issuingCountry": "IN",
    "issueDate": "2021-04-10",
    "expiryDate": "2031-04-09"
  },
  "contact": {
    "email": "applicant@example.com",
    "phone": "+911234567890"
  },
  "extractedFrom": {
    "documentId": "doc_123",
    "source": "passport",
    "extractedAt": "2026-07-31T06:30:00.000Z"
  }
}
```

## 2. `score_risk` Combined Input Shape

`score_risk` consumes the output of both `detect_duplicate_signals` and `build_risk_graph`.

The real duplicate and graph logic can be stubbed, but the returned shapes must match this contract.

```ts
import { z } from "zod";

export const DuplicateSignalSchema = z.object({
  signalId: z.string().min(1),
  type: z.enum([
    "passport_number_match",
    "name_dob_match",
    "email_match",
    "phone_match",
    "document_similarity",
    "manual_review_flag"
  ]),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  matchedApplicationId: z.string().min(1),
  evidence: z.record(z.unknown()).default({}),
});

export const DetectDuplicateSignalsResultSchema = z.object({
  applicationId: z.string().min(1),
  signals: z.array(DuplicateSignalSchema),
});

export const RiskGraphNodeSchema = z.object({
  nodeId: z.string().min(1),
  kind: z.enum(["application", "applicant", "document", "passport", "contact", "external_record"]),
  label: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});

export const RiskGraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationship: z.enum([
    "owns",
    "matches",
    "submitted",
    "shares_identifier",
    "linked_to",
    "flagged_by"
  ]),
  weight: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).default({}),
});

export const BuildRiskGraphResultSchema = z.object({
  applicationId: z.string().min(1),
  nodes: z.array(RiskGraphNodeSchema),
  edges: z.array(RiskGraphEdgeSchema),
});

export const ScoreRiskInputSchema = z.object({
  applicationId: z.string().min(1),
  duplicateSignals: DetectDuplicateSignalsResultSchema,
  riskGraph: BuildRiskGraphResultSchema,
});

export type DetectDuplicateSignalsResult = z.infer<typeof DetectDuplicateSignalsResultSchema>;
export type BuildRiskGraphResult = z.infer<typeof BuildRiskGraphResultSchema>;
export type ScoreRiskInput = z.infer<typeof ScoreRiskInputSchema>;
```

Required JSON shape:

```json
{
  "applicationId": "app_123",
  "duplicateSignals": {
    "applicationId": "app_123",
    "signals": [
      {
        "signalId": "sig_001",
        "type": "passport_number_match",
        "severity": "high",
        "confidence": 0.98,
        "matchedApplicationId": "app_456",
        "evidence": {
          "passportNumber": "P1234567"
        }
      }
    ]
  },
  "riskGraph": {
    "applicationId": "app_123",
    "nodes": [
      {
        "nodeId": "app_123",
        "kind": "application",
        "label": "Application app_123",
        "metadata": {}
      }
    ],
    "edges": []
  }
}
```

## 3. `pipeline.stage_completed` Event Contract

Every tool on both sides must emit this exact event shape.

Frontend A's timeline depends on this contract and may break silently if fields are renamed, omitted, or nested differently.

```ts
import { z } from "zod";

export const PipelineStageCompletedEventSchema = z.object({
  applicationId: z.string().min(1),
  stage: z.string().min(1),
  result: z.record(z.unknown()),
});

export type PipelineStageCompletedEvent = z.infer<typeof PipelineStageCompletedEventSchema>;
```

Required JSON shape:

```json
{
  "applicationId": "app_123",
  "stage": "ocr_extract",
  "result": {
    "status": "completed",
    "summary": "Passport fields extracted successfully"
  }
}
```

Event name:

```text
pipeline.stage_completed
```

Do not emit alternate shapes such as:

```json
{
  "id": "app_123",
  "pipelineStage": "ocr_extract",
  "data": {}
}
```

