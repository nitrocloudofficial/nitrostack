import { ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { createTwoFilesPatch } from 'diff';
import { resolveSandboxProvider, type SandboxProvider } from '../services/sandbox-provider.js';
import { VerificationRunClient } from '../services/verification-run.client.js';
import { environmentMetaSchema } from '../domain/knowledge-card.js';
import { buildSuccessEnvelope, dependencyUnavailableEnvelope } from '../domain/response-envelope.js';

const verifyFixSchema = z.object({
  code: z.string().describe('The candidate fix source code to execute.'),
  testCommand: z.string().describe('The command to run verification (e.g. python main.py or node index.js).'),
  environment: environmentMetaSchema,
  baselineCode: z
    .string()
    .optional()
    .describe('The original/broken code before the fix, used to compute a real diff. Omit to diff against an empty file.'),
  filePath: z.string().optional().describe('Logical file path used to label the generated unified diff.'),
});

type VerifyStatus = 'PASS' | 'FAIL' | 'TIMEOUT';

export interface VerifyToolsOptions {
  sandboxClient?: SandboxProvider;
  verificationRunClient?: VerificationRunClient;
}

@Controller()
export class VerifyTools {
  private sandboxClient: SandboxProvider;
  private verificationRunClient: VerificationRunClient;

  constructor(options: VerifyToolsOptions = {}) {
    this.sandboxClient = options.sandboxClient ?? resolveSandboxProvider();
    this.verificationRunClient = options.verificationRunClient ?? new VerificationRunClient();
  }

  @Tool({
    name: 'verify_fix',
    description:
      'Executes a candidate fix inside an isolated sandbox against a real test command and persists the outcome as a server-owned Verification Run, later matched (never trusted) by submit_fix.',
    inputSchema: verifyFixSchema,
  })
  async verifyFix(params: z.infer<typeof verifyFixSchema>) {
    if (!this.verificationRunClient.isConnected()) {
      return dependencyUnavailableEnvelope(
        'Elasticsearch is not configured; verify_fix cannot persist verification evidence.'
      );
    }

    const filePath = params.filePath ?? 'file';
    const diff = createTwoFilesPatch(`a/${filePath}`, `b/${filePath}`, params.baselineCode ?? '', params.code);

    const result = await this.sandboxClient.runVerification({
      code: params.code,
      testCommand: params.testCommand,
      environment: params.environment,
    });

    const status: VerifyStatus = result.timedOut ? 'TIMEOUT' : result.status;

    const run = await this.verificationRunClient.create({
      status,
      patch: diff,
      testCommand: params.testCommand,
      environment: params.environment,
      diff,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.executionTimeMs,
      sandbox: result.sandboxType,
    });

    const warnings = result.truncated ? ['Execution output was truncated at the configured byte cap.'] : [];

    return buildSuccessEnvelope(
      status,
      {
        verificationRunId: run.verificationRunId,
        diff,
        executionLog: `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
        evidence: {
          verificationRunId: run.verificationRunId,
          verificationStatus: status,
          patchDigest: run.patchDigest,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          durationMs: result.executionTimeMs,
          sandbox: result.sandboxType,
          truncated: result.truncated,
          timestamp: run.createdAt,
        },
      },
      warnings
    );
  }
}
