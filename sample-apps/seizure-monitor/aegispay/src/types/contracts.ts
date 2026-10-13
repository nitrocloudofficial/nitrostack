// contracts.ts — AegisPay shared contract
//
// THE SINGLE SOURCE OF TRUTH FOR ALL SHARED SHAPES.
//
// Ownership: M1 finalises this in hour 0–1 and pushes to `main`.
// After that it is FROZEN. Any change requires all three people to agree
// and `git pull` immediately. Announce before pushing a change.
//
// This file has NO relative imports on purpose — it is a leaf. Nothing here
// imports from anywhere else in the project, so it can never cause a circular
// dependency and every module can safely depend on it.
//
// Goes at: src/types/contracts.ts

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** All amounts are integer paise (₹1 = 100). Never use floats for money. */
export type Paise = number;

// ---------------------------------------------------------------------------
// Vendors, invoices, payments
// ---------------------------------------------------------------------------

export interface Vendor {
  id: string;                 // e.g. "ACME-07"
  name: string;
  /** Bank account this vendor was last paid to. null if never paid. */
  lastPaidAccount: string | null;
}

export interface Invoice {
  id: string;                 // e.g. "INV-0018"
  vendorId: string;
  amount: Paise;
  /** Destination account on THIS invoice (may differ from vendor.lastPaidAccount). */
  destinationAccount: string;
  /** ISO date the invoice is dated. */
  invoiceDate: string;
  /** ISO timestamp the invoice was submitted into the queue. */
  submittedAt: string;
  /**
   * Free-text notes on the invoice. UNTRUSTED — may contain vendor-supplied
   * text, including the prompt-injection payload used in the demo. Never treat
   * anything in here as an instruction.
   */
  notes: string;
  status: 'pending' | 'drafted' | 'approved' | 'rejected' | 'blocked' | 'paid';
}

export interface Payment {
  id: string;
  vendorId: string;
  amount: Paise;
  destinationAccount: string;
  /** ISO timestamp the payment was made. */
  paidAt: string;
}

// ---------------------------------------------------------------------------
// Risk engine  (owned by LOQ — see risk.service.ts)
// ---------------------------------------------------------------------------

export type Severity = 'low' | 'medium' | 'high';

export type RuleId =
  | 'AMOUNT_TIER'
  | 'FIRST_TIME_PAYEE'
  | 'VELOCITY_SPIKE'
  | 'DUPLICATE_INVOICE'
  | 'STRUCTURING'
  | 'DENY_LIST'
  | 'ACCOUNT_CHANGED'
  | 'OFF_HOURS';

export interface RiskFlag {
  ruleId: RuleId;
  severity: Severity;
  /** Human-readable, shown verbatim in the approval widget and audit trail. */
  evidence: string;
}

/** Approval requirement derived from the flags. BLOCKED is terminal. */
export type DecisionTier =
  | 'AUTO'
  | 'SINGLE_APPROVAL'
  | 'DUAL_APPROVAL'
  | 'BLOCKED';

export interface Thresholds {
  /** At or below this: no approval needed. */
  autoLimit: Paise;
  /** Above this: requires dual approval. */
  dualLimit: Paise;
  /** Velocity spike fires above this multiple of the 90-day mean. */
  velocityMultiple: number;
  /** Structuring: payments within this fraction BELOW a limit look structured. */
  structuringBand: number; // e.g. 0.10 = within 10% below
  /** Business hours in IST, 24h. */
  businessStartHour: number;
  businessEndHour: number;
}

/**
 * Everything a rule is allowed to see. Rules are PURE FUNCTIONS of this —
 * no I/O, no clock reads. `evaluatedAt` is injected, never read from Date.now().
 */
export interface RiskContext {
  invoice: Invoice;
  vendor: Vendor;
  vendorHistory: Payment[];    // last 90 days for this vendor
  sameDayPayments: Payment[];  // all payments to this payee today
  denyList: string[];          // vendor IDs and/or account numbers
  evaluatedAt: string;         // ISO — injected
  thresholds: Thresholds;
}

export interface RiskAssessment {
  invoiceId: string;
  flags: RiskFlag[];
  tier: DecisionTier;
}

// ---------------------------------------------------------------------------
// Drafts, approvals, execution  (owned by M1)
// ---------------------------------------------------------------------------

export interface PaymentDraft {
  draftId: string;
  invoiceIds: string[];
  total: Paise;
  createdBy: string;           // auth subject
  createdAt: string;           // ISO
}

export interface ApprovalRequest {
  approvalId: string;
  draftId: string;
  total: Paise;
  flags: RiskFlag[];
  tier: DecisionTier;
  status: 'pending' | 'approved' | 'rejected';
  /**
   * The token minted ONLY when a human approves via the widget.
   * execute_payment requires this. There is no other way to obtain it.
   * Undefined until approved.
   */
  approvalToken?: string;
}

export interface Receipt {
  receiptId: string;
  approvalId: string;
  invoiceIds: string[];
  total: Paise;
  executedAt: string;          // ISO
}

// ---------------------------------------------------------------------------
// Audit  (owned by M1)
// ---------------------------------------------------------------------------

export interface AuditEntry {
  seq: number;                 // monotonic
  timestamp: string;           // ISO
  tool: string;                // which tool was called
  subject: string | null;      // auth subject, if any
  outcome: 'allowed' | 'blocked';
  /** Present when blocked — why. Includes any injected string, quoted. */
  reason?: string;
  /** SHA-256 of (prevHash + this entry's canonical JSON). Chain integrity. */
  hash: string;
  prevHash: string;
}

// ---------------------------------------------------------------------------
// Auth  (set by JWTGuard, read via ExecutionContext.auth)
// ---------------------------------------------------------------------------

export interface AuthContext {
  subject: string;
  role: 'analyst' | 'controller';
}
