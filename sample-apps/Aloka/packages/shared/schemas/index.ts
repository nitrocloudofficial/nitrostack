import { z } from 'zod';

export const WebhookPayloadSchema = z.object({
  repository_url: z.string().url(),
  branch_name:    z.string(),
  commit_sha:     z.string(),
  failing_job_id: z.string(),
  /** GitHub Actions workflow run ID — required for ci-mcp GraphRAG tools */
  run_id:         z.string(),
  /** Repository owner / organisation — required for ci-mcp and git-mcp tools */
  owner:          z.string(),
  /** Repository name — required for ci-mcp and git-mcp tools */
  repo:           z.string(),
  author:         z.string().optional(),
  timestamp:      z.string().datetime().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
