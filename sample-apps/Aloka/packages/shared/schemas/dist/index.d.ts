import { z } from 'zod';
export declare const WebhookPayloadSchema: z.ZodObject<{
    repository_url: z.ZodString;
    branch_name: z.ZodString;
    commit_sha: z.ZodString;
    failing_job_id: z.ZodString;
    run_id: z.ZodString;
    owner: z.ZodString;
    repo: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
