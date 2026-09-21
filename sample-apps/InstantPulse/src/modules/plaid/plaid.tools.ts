import {
  Cache,
  ControllerDecorator as Controller,
  Injectable,
  RateLimit,
  ToolDecorator as Tool,
  UseFilters,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import { PlaidService } from './plaid.service.js';
import { PERSONAS, listPersonas } from './sandbox-personas.js';

const PERSONA_IDS = ['healthy', 'volatile', 'distressed', 'default'] as const;

const CreateLinkTokenInput = z.object({
  applicationId: z.string().describe('Application the connection belongs to'),
});

const ConnectSandboxInput = z.object({
  applicationId: z.string().describe('Application to attach the bank connection to'),
  persona: z.enum(PERSONA_IDS).default('healthy').describe('Which sandbox business profile to connect'),
  windowDays: z
    .number()
    .int()
    .min(30)
    .max(365)
    .default(180)
    .describe('How many days of transaction history to generate and analyse'),
});

const ExchangeTokenInput = z.object({
  applicationId: z.string().describe('Application the connection belongs to'),
  publicToken: z.string().describe('Public token returned by Plaid Link'),
});

const SyncSnapshotInput = z.object({
  applicationId: z.string().describe('Application with a connected bank account'),
  windowDays: z
    .number()
    .int()
    .min(30)
    .max(365)
    .default(180)
    .describe('How many days of history to retain for analysis'),
});

@Controller('plaid')
@Injectable({ deps: [ApplicationStore, PlaidService] })
export class PlaidTools {
  constructor(
    private readonly store: ApplicationStore,
    private readonly plaid: PlaidService,
  ) {}

  @Tool({
    name: 'create_link_token',
    description:
      'Create a Plaid Link token for the genuine hosted bank-connection flow. Use this when demonstrating ' +
      'the real consent experience an applicant would see. For a fast connection with no browser step, use ' +
      'plaid_connect_sandbox_bank instead.',
    inputSchema: CreateLinkTokenInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(CreateLinkTokenInput)
  @RateLimit({ requests: 20, window: '1m' })
  async createLinkToken(input: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);
    const result = await this.plaid.createLinkToken(application.applicationId, ctx.logger);

    this.store.recordAudit(application.applicationId, 'system', 'plaid.link_token_created', {
      simulated: result.simulated,
    });

    return {
      applicationId: application.applicationId,
      ...result,
      sandboxCredentials: { username: 'user_good', password: 'pass_good' },
    };
  }

  @Tool({
    name: 'connect_sandbox_bank',
    description:
      'Connect a Plaid Sandbox bank account to an application instantly, with no browser step. Pick a ' +
      'persona to control the financial profile: "healthy" produces a clean GREEN case, "volatile" a ' +
      'borderline YELLOW, "distressed" a blocked RED, and "default" uses Plaid\'s own stock sandbox user. ' +
      'Personas are seeded, so the same choice always yields the same result.',
    inputSchema: ConnectSandboxInput,
    examples: {
      request: { applicationId: 'app_1a2b3c4d5e6f7g8h', persona: 'healthy', windowDays: 180 },
      response: {
        applicationId: 'app_1a2b3c4d5e6f7g8h',
        status: 'BANK_CONNECTED',
        institutionName: 'First Platypus Bank',
        persona: 'healthy',
        simulated: false,
      },
    },
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ConnectSandboxInput)
  @RateLimit({ requests: 30, window: '1m' })
  async connectSandboxBank(
    input: { applicationId: string; persona: (typeof PERSONA_IDS)[number]; windowDays: number },
    ctx: ExecutionContext,
  ) {
    const application = this.store.getOrThrow(input.applicationId);
    const persona = PERSONAS[input.persona];

    const connection = await this.plaid.connectSandbox(
      application.applicationId,
      input.persona,
      input.windowDays,
      ctx.logger,
    );

    this.store.update(application.applicationId, {
      status: 'BANK_CONNECTED',
      plaid: {
        itemId: connection.itemId,
        accessToken: connection.accessToken,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        persona: connection.persona,
        connectedAt: new Date().toISOString(),
        simulated: connection.simulated,
      },
    });

    this.store.recordAudit(application.applicationId, 'system', 'plaid.bank_connected', {
      institutionName: connection.institutionName,
      persona: input.persona,
      simulated: connection.simulated,
    });

    return {
      applicationId: application.applicationId,
      status: 'BANK_CONNECTED',
      institutionName: connection.institutionName,
      persona: input.persona,
      personaNarrative: persona.narrative,
      expectedBand: persona.expectedBand,
      simulated: connection.simulated,
      dataSource: this.plaid.mode(),
      nextAction: 'Pull the transaction history with plaid_sync_financial_snapshot.',
    };
  }

  @Tool({
    name: 'exchange_public_token',
    description:
      'Exchange a Plaid public token — the value Link hands back after an applicant completes the hosted ' +
      'flow — for a durable access token, and attach it to the application.',
    inputSchema: ExchangeTokenInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ExchangeTokenInput)
  @RateLimit({ requests: 30, window: '1m' })
  async exchangePublicToken(
    input: { applicationId: string; publicToken: string },
    ctx: ExecutionContext,
  ) {
    const application = this.store.getOrThrow(input.applicationId);
    const connection = await this.plaid.exchangePublicToken(input.publicToken, ctx.logger);

    this.store.update(application.applicationId, {
      status: 'BANK_CONNECTED',
      plaid: {
        itemId: connection.itemId,
        accessToken: connection.accessToken,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        persona: connection.persona,
        connectedAt: new Date().toISOString(),
        simulated: connection.simulated,
      },
    });

    this.store.recordAudit(application.applicationId, 'system', 'plaid.token_exchanged', {
      itemId: connection.itemId,
    });

    return {
      applicationId: application.applicationId,
      status: 'BANK_CONNECTED',
      itemId: connection.itemId,
      institutionName: connection.institutionName,
      simulated: connection.simulated,
      nextAction: 'Pull the transaction history with plaid_sync_financial_snapshot.',
    };
  }

  @Tool({
    name: 'sync_financial_snapshot',
    description:
      'Pull accounts, balances, transaction history and any liabilities for a connected application, and ' +
      'normalise them into a scoreable ledger. Returns a summary — the raw ledger is held server-side and ' +
      'never sent to the client.',
    inputSchema: SyncSnapshotInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(SyncSnapshotInput)
  @RateLimit({ requests: 20, window: '1m' })
  @Cache({
    ttl: 300,
    key: (input) => {
      const { applicationId, windowDays } = input as { applicationId: string; windowDays: number };
      return `snapshot:${applicationId}:${windowDays}`;
    },
  })
  async syncFinancialSnapshot(
    input: { applicationId: string; windowDays: number },
    ctx: ExecutionContext,
  ) {
    const application = this.store.getOrThrow(input.applicationId);

    if (!application.plaid) {
      throw new Error(
        `Application "${input.applicationId}" has no bank account connected. Run ` +
          `plaid_connect_sandbox_bank first.`,
      );
    }

    const snapshot = await this.plaid.fetchSnapshot(
      application.applicationId,
      {
        itemId: application.plaid.itemId,
        accessToken: application.plaid.accessToken,
        institutionId: application.plaid.institutionId,
        institutionName: application.plaid.institutionName,
        persona: application.plaid.persona,
        simulated: application.plaid.simulated,
      },
      input.windowDays,
      ctx.logger,
    );

    this.store.update(application.applicationId, { status: 'DATA_SYNCED', snapshot });
    this.store.recordAudit(application.applicationId, 'system', 'plaid.snapshot_synced', {
      transactionCount: snapshot.transactions.length,
      source: snapshot.source,
    });

    const inflow = snapshot.transactions.filter((t) => t.direction === 'inflow');

    return {
      applicationId: application.applicationId,
      status: 'DATA_SYNCED',
      source: snapshot.source,
      institutionName: snapshot.institutionName,
      windowDays: snapshot.windowDays,
      accounts: snapshot.accounts.map((a) => ({
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        currentBalance: a.currentBalance,
      })),
      transactionCount: snapshot.transactions.length,
      inflowCount: inflow.length,
      outflowCount: snapshot.transactions.length - inflow.length,
      earliestTransaction: snapshot.transactions[0]?.date,
      latestTransaction: snapshot.transactions[snapshot.transactions.length - 1]?.date,
      totalCurrentBalance: snapshot.totalCurrentBalance,
      liabilityCount: snapshot.liabilities.length,
      nextAction: 'Compute the cash-flow metrics with analytics_analyze_cash_flow.',
    };
  }

  @Tool({
    name: 'list_personas',
    description:
      'List the reproducible sandbox businesses available to plaid_connect_sandbox_bank, with the band each ' +
      'is built to produce. Useful for setting up a demo.',
    inputSchema: z.object({}),
  })
  @Cache({ ttl: 3600 })
  async listSandboxPersonas() {
    return {
      dataSource: this.plaid.mode(),
      personas: listPersonas(),
    };
  }
}
