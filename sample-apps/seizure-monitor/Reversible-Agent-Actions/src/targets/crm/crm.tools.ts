import { Injectable, ToolDecorator as Tool, UseInterceptors, UsePipes, z } from '@nitrostack/core';
import type { OnModuleInit } from '@nitrostack/core';
import { ulid } from 'ulid';
import { Compensatable } from '../../txn/decorators/compensatable.decorator.js';
import { JournalInterceptor } from '../../txn/interceptors/journal.interceptor.js';
import { JournalCapturePipe } from '../../txn/pipes/journal-capture.pipe.js';
import { CompensatorRegistry } from '../../txn/services/registry.service.js';

type Tier = 'basic' | 'premium' | 'enterprise';

interface Account {
  id: string;
  name: string;
  domain: string;
  tier: Tier;
  apiKeys: string[];
  createdAt: Date;
  updatedAt: Date;
  /**
   * Monotonic revision counter used as the optimistic-concurrency version
   * instead of updatedAt: Date.toISOString() only has millisecond resolution,
   * so two rapid sequential writes (routine under real load, not just in
   * fast tests) can produce identical timestamps and make genuinely
   * different versions compare as equal.
   */
  rev: number;
}

interface ApiKey {
  keyId: string;
  accountId: string;
  scope: 'read' | 'write';
  createdAt: Date;
}

const CreateAccountSchema = z.object({ name: z.string(), domain: z.string() });
const DeleteAccountSchema = z.object({ accountId: z.string() });
const UpdateTierSchema = z.object({ accountId: z.string(), tier: z.enum(['basic', 'premium', 'enterprise']) });
const GrantApiKeySchema = z.object({ accountId: z.string(), scope: z.enum(['read', 'write']) });
const RevokeApiKeySchema = z.object({ keyId: z.string() });
const GetAccountSchema = z.object({ accountId: z.string() });
const ListAccountsSchema = z.object({});

/** In-memory CRM target server: accounts and API keys, with compensator specs for each write. */
@Injectable({ deps: [CompensatorRegistry] })
export class CrmTools implements OnModuleInit {
  private readonly accounts = new Map<string, Account>();
  private readonly apiKeys = new Map<string, ApiKey>();

  constructor(private readonly registry: CompensatorRegistry) {}

  /**
   * @nitrostack/core never instantiates @Module-decorated classes (only their
   * static metadata is read), so a module constructor can't perform this
   * registration. onModuleInit does run, but only if the bootstrap explicitly
   * calls triggerLifecycleHook(...) after McpApplicationFactory.create() — see
   * src/index.ts.
   */
  onModuleInit(): void {
    this.registry.registerFromClass(this.constructor);
  }

  @Tool({
    name: 'create_account',
    description: 'Create a new CRM account.',
    inputSchema: CreateAccountSchema,
  })
  @Compensatable({
    server: 'crm',
    baseClass: 'CLEAN',
    requiresPreRead: false,
    inverse: 'delete_account',
    argsFromOutput: (out) => ({ accountId: (out as { id: string }).id }),
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async create_account(input: z.infer<typeof CreateAccountSchema>) {
    const now = new Date();
    const account: Account = {
      id: `acc_${ulid()}`,
      name: input.name,
      domain: input.domain,
      tier: 'basic',
      apiKeys: [],
      createdAt: now,
      updatedAt: now,
      rev: 1,
    };
    this.accounts.set(account.id, account);
    return { id: account.id, name: account.name, domain: account.domain, tier: account.tier };
  }

  @Tool({
    name: 'delete_account',
    description: 'Delete a CRM account. No compensator — this is the inverse of create_account.',
    inputSchema: DeleteAccountSchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async delete_account(input: z.infer<typeof DeleteAccountSchema>) {
    this.accounts.delete(input.accountId);
    return { deleted: true, accountId: input.accountId };
  }

  @Tool({
    name: 'update_tier',
    description: 'Change an account\'s subscription tier.',
    inputSchema: UpdateTierSchema,
  })
  @Compensatable({
    server: 'crm',
    baseClass: 'RESTORATIVE',
    requiresPreRead: true,
    preReadTool: 'get_account',
    preReadArgs: (i) => ({ accountId: (i as { accountId: string }).accountId }),
    inverse: 'update_tier',
    argsFromOutput: (_o, i, prior) => ({
      accountId: (i as { accountId: string }).accountId,
      tier: (prior as { tier: Tier }).tier,
    }),
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async update_tier(input: z.infer<typeof UpdateTierSchema>) {
    const account = this.accounts.get(input.accountId);
    if (!account) throw new Error(`Account not found: ${input.accountId}`);
    const previousTier = account.tier;
    account.tier = input.tier;
    account.updatedAt = new Date();
    account.rev++;
    return { accountId: account.id, newTier: account.tier, previousTier };
  }

  @Tool({
    name: 'grant_api_key',
    description: 'Grant a new API key on an account.',
    inputSchema: GrantApiKeySchema,
  })
  @Compensatable({
    server: 'crm',
    baseClass: 'CLEAN',
    requiresPreRead: false,
    inverse: 'revoke_api_key',
    argsFromOutput: (out) => ({ keyId: (out as { keyId: string }).keyId }),
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async grant_api_key(input: z.infer<typeof GrantApiKeySchema>) {
    const account = this.accounts.get(input.accountId);
    if (!account) throw new Error(`Account not found: ${input.accountId}`);
    const key: ApiKey = { keyId: `key_${ulid()}`, accountId: account.id, scope: input.scope, createdAt: new Date() };
    this.apiKeys.set(key.keyId, key);
    account.apiKeys.push(key.keyId);
    account.updatedAt = new Date();
    account.rev++;
    return { keyId: key.keyId, scope: key.scope };
  }

  @Tool({
    name: 'revoke_api_key',
    description: 'Revoke an API key. No compensator — this is the inverse of grant_api_key.',
    inputSchema: RevokeApiKeySchema,
  })
  @UseInterceptors(JournalInterceptor as any)
  @UsePipes(JournalCapturePipe)
  async revoke_api_key(input: z.infer<typeof RevokeApiKeySchema>) {
    const key = this.apiKeys.get(input.keyId);
    if (key) {
      const account = this.accounts.get(key.accountId);
      if (account) {
        account.apiKeys = account.apiKeys.filter((id) => id !== input.keyId);
        account.updatedAt = new Date();
    account.rev++;
      }
      this.apiKeys.delete(input.keyId);
    }
    return { revoked: true, keyId: input.keyId };
  }

  @Tool({
    name: 'get_account',
    description: 'Read an account by id. Returns .ref and .version for conflict detection.',
    inputSchema: GetAccountSchema,
  })
  async get_account(input: z.infer<typeof GetAccountSchema>) {
    const account = this.accounts.get(input.accountId);
    if (!account) throw new Error(`Account not found: ${input.accountId}`);
    return {
      id: account.id,
      name: account.name,
      domain: account.domain,
      tier: account.tier,
      apiKeys: account.apiKeys,
      ref: `crm:account:${account.id}`,
      version: String(account.rev),
    };
  }

  @Tool({
    name: 'list_accounts',
    description: 'List all CRM accounts. Used for demo proof-of-existence.',
    inputSchema: ListAccountsSchema,
  })
  async list_accounts() {
    return Array.from(this.accounts.values());
  }
}
