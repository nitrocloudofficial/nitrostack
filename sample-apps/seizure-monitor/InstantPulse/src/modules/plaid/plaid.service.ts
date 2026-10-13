import { randomUUID } from 'node:crypto';
import { Injectable, type Logger } from '@nitrostack/core';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';
import type {
  FinancialSnapshot,
  NormalizedAccount,
  PersonaId,
} from '../../common/types/instantpulse.types.js';
import {
  PERSONAS,
  buildCustomUserConfig,
  generateLedger,
  type PersonaProfile,
} from './sandbox-personas.js';
import {
  ledgerToNormalized,
  normalizeAccounts,
  normalizeLiabilities,
  normalizeTransactions,
} from './transaction-normalizer.js';

/**
 * Plaid delivers transactions in two stages: an initial update covering roughly
 * the last 30 days, then a historical backfill (~90 days in Sandbox, up to 24
 * months in production). Neither stage announces itself in the sync response —
 * an item that is still backfilling looks exactly like one that has finished.
 * These bound how long we wait for the ledger to stop growing.
 */
const SYNC_BUDGET_MS = 20_000;
const SYNC_POLL_INTERVAL_MS = 1_500;
const SYNC_QUIET_POLLS = 3;

export interface BankConnection {
  itemId: string;
  accessToken: string;
  institutionId: string;
  institutionName: string;
  persona: PersonaId;
  simulated: boolean;
}

/**
 * The only place that talks to Plaid.
 *
 * Runs in one of two modes. With PLAID_CLIENT_ID/PLAID_SECRET set it drives the
 * real Sandbox API — link tokens, item exchange, /transactions/sync, the lot.
 * Without them it serves the same personas from the local generator and marks
 * every result `simulated`. The mode is never silently ambiguous: `source` on
 * the snapshot always says which one produced the numbers.
 *
 * The fallback is deliberate. A demo that dies because the venue wifi ate a
 * request is a demo that did not happen.
 */
@Injectable({ deps: [] })
export class PlaidService {
  private client: PlaidApi | null = null;
  private clientResolved = false;

  /** True when real Sandbox credentials are configured. */
  isLive(): boolean {
    return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET?.trim());
  }

  mode(): 'plaid_sandbox' | 'simulated' {
    return this.isLive() ? 'plaid_sandbox' : 'simulated';
  }

  private getClient(): PlaidApi {
    if (!this.clientResolved) {
      const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
      const basePath = PlaidEnvironments[env] ?? PlaidEnvironments.sandbox;

      this.client = new PlaidApi(
        new Configuration({
          basePath,
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
              'PLAID-SECRET': process.env.PLAID_SECRET,
            },
          },
        }),
      );
      this.clientResolved = true;
    }

    if (!this.client) throw new Error('Plaid client unavailable.');
    return this.client;
  }

  // -------------------------------------------------------------------------
  // Link flow
  // -------------------------------------------------------------------------

  /**
   * Create a Link token for the genuine hosted Plaid Link handoff.
   * Only meaningful in live mode — simulation has no browser step.
   */
  async createLinkToken(applicationId: string, logger: Logger): Promise<{
    linkToken: string;
    expiration: string;
    simulated: boolean;
    instructions: string;
  }> {
    if (!this.isLive()) {
      return {
        linkToken: `link-sandbox-simulated-${randomUUID().slice(0, 8)}`,
        expiration: new Date(Date.now() + 4 * 3600_000).toISOString(),
        simulated: true,
        instructions:
          'Simulated token — no Plaid credentials configured, so there is no Link session to open. ' +
          'Use plaid_connect_sandbox_bank to continue, or set PLAID_CLIENT_ID and PLAID_SECRET for the real flow.',
      };
    }

    const products = (process.env.PLAID_PRODUCTS || 'transactions')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean) as Products[];

    const countries = (process.env.PLAID_COUNTRY_CODES || 'US')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean) as CountryCode[];

    logger.info('Creating Plaid Link token', { applicationId, products });

    const res = await this.getClient().linkTokenCreate({
      user: { client_user_id: applicationId },
      client_name: 'InstantPulse',
      products,
      country_codes: countries,
      language: 'en',
    });

    return {
      linkToken: res.data.link_token,
      expiration: res.data.expiration,
      simulated: false,
      instructions:
        'Open Plaid Link with this token, sign in as user_good / pass_good, then pass the resulting ' +
        'public token to plaid_exchange_public_token.',
    };
  }

  /**
   * Connect a sandbox bank without a browser step.
   *
   * Custom personas are injected via Plaid's `user_custom` override so the
   * sandbox returns our generated ledger. If Plaid rejects the override config
   * we retry with the stock sandbox user rather than failing the demo outright.
   */
  async connectSandbox(
    applicationId: string,
    personaId: PersonaId,
    windowDays: number,
    logger: Logger,
  ): Promise<BankConnection> {
    const persona = PERSONAS[personaId];

    if (!this.isLive()) {
      logger.warn('Plaid credentials absent — connecting simulated bank', { personaId });
      return {
        itemId: `sim_item_${randomUUID().slice(0, 12)}`,
        accessToken: `sim-access-${applicationId}-${personaId}`,
        institutionId: persona.institutionId,
        institutionName: persona.institutionName,
        persona: personaId,
        simulated: true,
      };
    }

    const client = this.getClient();
    const useCustom = !persona.usesStockSandboxUser;

    let publicToken: string;
    try {
      const res = await client.sandboxPublicTokenCreate({
        institution_id: persona.institutionId,
        initial_products: [Products.Transactions],
        options: {
          // Without this Plaid only materializes its default ~30-day window,
          // which would trip the insufficient-history blocker on every applicant.
          transactions: { days_requested: Math.min(730, Math.max(windowDays, 90)) },
          ...(useCustom
            ? {
                override_username: 'user_custom',
                override_password: buildCustomUserConfig(persona, windowDays),
              }
            : {}),
        },
      });
      publicToken = res.data.public_token;
    } catch (error) {
      if (!useCustom) throw error;

      logger.warn('Custom sandbox user rejected — falling back to stock sandbox user', {
        personaId,
        reason: (error as Error).message,
      });

      const res = await client.sandboxPublicTokenCreate({
        institution_id: persona.institutionId,
        initial_products: [Products.Transactions],
        options: { transactions: { days_requested: Math.min(730, Math.max(windowDays, 90)) } },
      });
      publicToken = res.data.public_token;
    }

    const connection = await this.exchangePublicToken(publicToken, logger);
    return { ...connection, persona: personaId, institutionName: persona.institutionName };
  }

  async exchangePublicToken(publicToken: string, logger: Logger): Promise<BankConnection> {
    if (!this.isLive()) {
      return {
        itemId: `sim_item_${randomUUID().slice(0, 12)}`,
        accessToken: `sim-access-${publicToken}`,
        institutionId: PERSONAS.default.institutionId,
        institutionName: PERSONAS.default.institutionName,
        persona: 'default',
        simulated: true,
      };
    }

    const res = await this.getClient().itemPublicTokenExchange({ public_token: publicToken });
    logger.info('Exchanged Plaid public token', { itemId: res.data.item_id });

    return {
      itemId: res.data.item_id,
      accessToken: res.data.access_token,
      institutionId: '',
      institutionName: 'Connected institution',
      persona: 'default',
      simulated: false,
    };
  }

  // -------------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------------

  async fetchSnapshot(
    applicationId: string,
    connection: BankConnection,
    windowDays: number,
    logger: Logger,
  ): Promise<FinancialSnapshot> {
    if (connection.simulated || !this.isLive()) {
      return this.simulateSnapshot(applicationId, connection, windowDays);
    }

    try {
      const client = this.getClient();
      const accessToken = connection.accessToken;

      const balances = await client.accountsBalanceGet({ access_token: accessToken });
      const accounts = normalizeAccounts(balances.data.accounts);

      const cutoff = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
      const raw = await this.syncAllTransactions(accessToken, logger);
      const transactions = normalizeTransactions(raw).filter((t) => t.date >= cutoff);

      // Liabilities are optional — most sandbox items are created with
      // transactions only, and a missing product is not an error worth failing on.
      let liabilities: FinancialSnapshot['liabilities'] = [];
      try {
        const res = await client.liabilitiesGet({ access_token: accessToken });
        liabilities = normalizeLiabilities(res.data.liabilities, accounts);
      } catch {
        logger.info('Liabilities product not available for this item — continuing without it');
      }

      logger.info('Plaid snapshot assembled', {
        applicationId,
        accounts: accounts.length,
        transactions: transactions.length,
      });

      return {
        applicationId,
        fetchedAt: new Date().toISOString(),
        source: 'plaid_sandbox',
        institutionName: connection.institutionName,
        windowDays,
        accounts,
        transactions,
        liabilities,
        totalCurrentBalance: sumDepositoryBalances(accounts),
      };
    } catch (error) {
      // Plaid sandbox items can take time to have transactions ready. If the
      // real sync fails for any reason (PRODUCT_NOT_READY timeout, rate limit,
      // network hiccup), fall back to the deterministic persona generator so
      // the demo pipeline always completes.
      logger.warn('Plaid live sync failed — falling back to simulated snapshot', {
        applicationId,
        reason: (error as Error).message,
      });
      return this.simulateSnapshot(applicationId, connection, windowDays);
    }
  }

  /**
   * Fetch the full transaction history for an item.
   *
   * A freshly created sandbox item does not have its ledger ready immediately,
   * and — this is the trap — it does not say so. The first /transactions/sync
   * call returns `added: []` with `has_more: false` and no error at all, which
   * is indistinguishable from a genuinely empty account. Taking that at face
   * value yields a zero-transaction snapshot and an INSUFFICIENT_HISTORY
   * decline for a perfectly good business.
   *
   * So an empty result is treated as "not ready yet" and retried from a fresh
   * cursor until data appears or the budget runs out. Only a still-empty
   * account after the full budget is reported as genuinely empty.
   */
  private async syncAllTransactions(accessToken: string, logger: Logger) {
    const deadline = Date.now() + SYNC_BUDGET_MS;
    const all: Parameters<typeof normalizeTransactions>[0] = [];
    let cursor: string | undefined;
    let quietPolls = 0;

    while (Date.now() < deadline) {
      const page = await this.syncPage(accessToken, cursor, logger);
      all.push(...page.added);
      cursor = page.cursor;

      quietPolls = page.added.length > 0 ? 0 : quietPolls + 1;

      // Stop only once the ledger has actually settled. Both stages have landed
      // when several consecutive polls bring nothing new.
      if (all.length > 0 && quietPolls >= SYNC_QUIET_POLLS) {
        logger.info('Plaid ledger settled', {
          transactions: all.length,
          earliest: all.map((t) => t.date).sort()[0],
        });
        return all;
      }

      await sleep(SYNC_POLL_INTERVAL_MS);
    }

    if (all.length === 0) {
      logger.warn('Plaid returned no transactions within the sync budget');
    } else {
      logger.warn('Sync budget expired while the ledger was still growing', { transactions: all.length });
    }
    return all;
  }

  /** One complete pass through the sync cursor. */
  private async syncPage(accessToken: string, cursor: string | undefined, logger: Logger) {
    const client = this.getClient();
    const added: Parameters<typeof normalizeTransactions>[0] = [];
    let notReadyRetries = 0;
    let nextCursor = cursor;

    for (;;) {
      try {
        const res = await client.transactionsSync({
          access_token: accessToken,
          cursor: nextCursor,
          count: 500,
        });

        added.push(...(res.data.added as typeof added));
        nextCursor = res.data.next_cursor;
        if (!res.data.has_more) return { added, cursor: nextCursor };
      } catch (error) {
        const code = (error as { response?: { data?: { error_code?: string } } })?.response?.data
          ?.error_code;

        if (code === 'PRODUCT_NOT_READY' && notReadyRetries < 5) {
          notReadyRetries++;
          logger.info('Plaid transactions not ready yet — retrying', { attempt: notReadyRetries });
          await sleep(1200 * notReadyRetries);
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Build a snapshot entirely from the persona generator. Same numbers the live
   * path would produce, since both read from `generateLedger`.
   */
  private simulateSnapshot(
    applicationId: string,
    connection: BankConnection,
    windowDays: number,
  ): FinancialSnapshot {
    const persona = PERSONAS[connection.persona];
    const accountId = `sim_acct_${connection.persona}`;
    const ledger = generateLedger(persona, windowDays);
    const transactions = ledgerToNormalized(ledger, accountId);

    const netFlow = transactions.reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = round2(persona.params.startingBalance + netFlow);

    const accounts: NormalizedAccount[] = [
      {
        accountId,
        name: persona.accountName,
        officialName: `${persona.label} ${persona.accountName}`,
        type: 'depository',
        subtype: 'checking',
        mask: String(1000 + (persona.params.seed % 9000)).slice(0, 4),
        currentBalance,
        availableBalance: currentBalance,
        isoCurrencyCode: 'USD',
      },
    ];

    return {
      applicationId,
      fetchedAt: new Date().toISOString(),
      source: 'simulated',
      institutionName: `${persona.institutionName} (simulated)`,
      windowDays,
      accounts,
      transactions,
      liabilities: [],
      totalCurrentBalance: currentBalance,
    };
  }

  describePersona(personaId: PersonaId): PersonaProfile {
    return PERSONAS[personaId];
  }
}

function sumDepositoryBalances(accounts: NormalizedAccount[]): number {
  return round2(
    accounts
      .filter((a) => a.type === 'depository')
      .reduce((sum, a) => sum + a.currentBalance, 0),
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
