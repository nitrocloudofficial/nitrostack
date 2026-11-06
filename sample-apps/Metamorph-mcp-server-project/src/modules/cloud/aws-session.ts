// STS AssumeRole with the operator's base identity (standard AWS SDK credential chain). The session credentials live only in
// memory for this call, 900 s at most, and are never returned, logged or put in an error message.
import { randomBytes } from 'node:crypto';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { EC2Client } from '@aws-sdk/client-ec2';
import { EKSClient } from '@aws-sdk/client-eks';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { RDSClient } from '@aws-sdk/client-rds';
import { CloudError, SETUP_HINT, errorCode, scrubAws, type AwsConfig } from './aws-config.js';

export const SESSION_SECONDS = 900;

export interface SessionCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface RegionClients {
  lambda: LambdaClient;
  rds: RDSClient;
  eks: EKSClient;
  ec2: EC2Client;
}

/** Anything with the STS client's send(); tests pass a stub. */
export interface StsLike {
  send(command: AssumeRoleCommand): Promise<{ Credentials?: { AccessKeyId?: string; SecretAccessKey?: string; SessionToken?: string } }>;
}

export function newSessionName(): string {
  return `metamorph-${randomBytes(6).toString('hex')}`;
}

export interface AssumeDeps {
  sts?: StsLike;
  sessionName?: () => string;
}

export async function assumeReadOnlyRole(cfg: AwsConfig, deps: AssumeDeps = {}): Promise<SessionCredentials> {
  const sts = deps.sts ?? (new STSClient({ region: cfg.regions[0] }) as unknown as StsLike);
  try {
    const out = await sts.send(
      new AssumeRoleCommand({
        RoleArn: cfg.roleArn,
        RoleSessionName: (deps.sessionName ?? newSessionName)(),
        ExternalId: cfg.externalId,
        DurationSeconds: SESSION_SECONDS
      })
    );
    const c = out.Credentials;
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) throw new CloudError('empty credentials', 'EmptyCredentials');
    return { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretAccessKey, sessionToken: c.SessionToken };
  } catch (e) {
    const code = errorCode(e);
    const expired = code === 'ExpiredToken' || code === 'ExpiredTokenException';
    throw new CloudError(
      `Could not assume the read-only AWS role (${scrubAws(code)}). ${expired ? 'The base credentials of this server have expired; the operator must refresh them. ' : 'Check that the role trusts this server\'s identity, the external id matches and the base identity may call sts:AssumeRole. '}${SETUP_HINT}`,
      code
    );
  }
}

export function makeRegionClients(region: string, creds: SessionCredentials): RegionClients {
  const credentials = { ...creds };
  const base = { region, credentials, maxAttempts: 3 };
  return { lambda: new LambdaClient(base), rds: new RDSClient(base), eks: new EKSClient(base), ec2: new EC2Client(base) };
}
