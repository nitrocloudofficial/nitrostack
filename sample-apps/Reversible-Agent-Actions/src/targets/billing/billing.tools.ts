import { Injectable, ToolDecorator as Tool, UseInterceptors, UsePipes, z } from '@nitrostack/core';
import type { OnModuleInit } from '@nitrostack/core';
import { ulid } from 'ulid';
import { Compensatable } from '../../txn/decorators/compensatable.decorator.js';
import { JournalInterceptor } from '../../txn/interceptors/journal.interceptor.js';
import { JournalCapturePipe } from '../../txn/pipes/journal-capture.pipe.js';
import { CompensatorRegistry } from '../../txn/services/registry.service.js';

interface Authorization {
  authId: string;
  accountId: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'voided';
  createdAt: Date;
}

interface Charge {
  chargeId: string;
  accountId: string;
  amount: number;
  currency: string;
  status: 'captured' | 'refund_pending';
  capturedAt: Date;
}

interface Payout {
  payoutId: string;
  accountId: string;
  amount: number;
  status: 'processing';
  createdAt: Date;
}

const AuthorizePaymentSchema = z.object({ accountId: z.string(), amount: z.number().positive(), currency: z.string() });
const VoidAuthorizationSchema = z.object({ authId: z.string() });
const CapturePaymentSchema = z.object({ accountId: z.string(), amount: z.number().positive(), currency: z.string() });
const RefundPaymentSchema = z.object({ chargeId: z.string(), amount: z.number().positive() });
const IssuePayoutSchema = z.object({ accountId: z.string(), amount: z.number().positive() });
const ListChargesSchema = z.object({});

/** In-memory billing target server: authorizations, charges, and payouts. */
@Injectable({ deps: [CompensatorRegistry] })
export class BillingTools implements OnModuleInit {
  private readonly authorizations = new Map<string, Authorization>();
  private readonly charges = new Map<string, Charge>();
  private readonly payouts = new Map<string, Payout>();

  constructor(private readonly registry: CompensatorRegistry) {}

  /** See CrmTools.onModuleInit for why this can't live in a module constructor. */
  onModuleInit(): void {
    this.registry.registerFromClass(this.constructor);
  }

  @Tool({
    name: 'authorize_payment',
    description: 'Place a payment authorization hold. Decays to a mere counteraction option after 7 days.',
    inputSchema: AuthorizePaymentSchema,
  })
  @Compensatable({
    server: 'billing',
    baseClass: 'CLEAN',
    requiresPreRead: false,
    inverse: 'void_authorization',
    argsFromOutput: (out) => ({ authId: (out as { authId: string }).authId }),
    window: 7 * 24 * 60 * 60 * 1000,
    decaysTo: 'MITIGABLE',
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async authorize_payment(input: z.infer<typeof AuthorizePaymentSchema>) {
    const auth: Authorization = {
      authId: `auth_${ulid()}`,
      accountId: input.accountId,
      amount: input.amount,
      currency: input.currency,
      status: 'authorized',
      createdAt: new Date(),
    };
    this.authorizations.set(auth.authId, auth);
    return { authId: auth.authId, amount: auth.amount, currency: auth.currency, status: auth.status };
  }

  @Tool({
    name: 'void_authorization',
    description: 'Void a payment authorization hold. This is the inverse of authorize_payment.',
    inputSchema: VoidAuthorizationSchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async void_authorization(input: z.infer<typeof VoidAuthorizationSchema>) {
    const auth = this.authorizations.get(input.authId);
    if (auth) auth.status = 'voided';
    return { voided: true };
  }

  @Tool({
    name: 'capture_payment',
    description: 'Capture a payment charge. Cannot be undone — only counteracted by a manual refund.',
    inputSchema: CapturePaymentSchema,
  })
  @Compensatable({
    server: 'billing',
    baseClass: 'MITIGABLE',
    requiresPreRead: false,
    counteractionOnly: true,
    inverse: 'refund_payment',
    argsFromOutput: (out) => ({
      chargeId: (out as { chargeId: string }).chargeId,
      amount: (out as { amount: number }).amount,
    }),
    manualInstruction: 'Refund via the billing console. Processor fee of ~2.9% is non-recoverable. Settlement 5–7 days.',
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async capture_payment(input: z.infer<typeof CapturePaymentSchema>) {
    const charge: Charge = {
      chargeId: `ch_${ulid()}`,
      accountId: input.accountId,
      amount: input.amount,
      currency: input.currency,
      status: 'captured',
      capturedAt: new Date(),
    };
    this.charges.set(charge.chargeId, charge);
    return {
      chargeId: charge.chargeId,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      capturedAt: charge.capturedAt,
    };
  }

  @Tool({
    name: 'refund_payment',
    description: 'Refund a captured payment. This is the inverse of capture_payment.',
    inputSchema: RefundPaymentSchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async refund_payment(input: z.infer<typeof RefundPaymentSchema>) {
    const charge = this.charges.get(input.chargeId);
    if (charge) charge.status = 'refund_pending';
    return { refundId: `re_${ulid()}`, status: 'pending_settlement' };
  }

  @Tool({
    name: 'issue_payout',
    description: 'Issue a payout to an external recipient. Irreversible once it leaves the platform.',
    inputSchema: IssuePayoutSchema,
  })
  @Compensatable({
    server: 'billing',
    baseClass: 'TERMINAL',
    requiresPreRead: false,
    inverse: null,
    manualInstruction: 'Payout has left the platform. Contact the recipient directly to arrange recovery.',
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async issue_payout(input: z.infer<typeof IssuePayoutSchema>) {
    const payout: Payout = {
      payoutId: `po_${ulid()}`,
      accountId: input.accountId,
      amount: input.amount,
      status: 'processing',
      createdAt: new Date(),
    };
    this.payouts.set(payout.payoutId, payout);
    return { payoutId: payout.payoutId, status: payout.status };
  }

  @Tool({
    name: 'list_charges',
    description: 'List all captured charges. Used for demo proof.',
    inputSchema: ListChargesSchema,
  })
  async list_charges() {
    return Array.from(this.charges.values());
  }
}
