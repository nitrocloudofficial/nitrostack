"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookPayloadSchema = void 0;
const zod_1 = require("zod");
exports.WebhookPayloadSchema = zod_1.z.object({
    repository_url: zod_1.z.string().url(),
    branch_name: zod_1.z.string(),
    commit_sha: zod_1.z.string(),
    failing_job_id: zod_1.z.string(),
    /** GitHub Actions workflow run ID — required for ci-mcp GraphRAG tools */
    run_id: zod_1.z.string(),
    /** Repository owner / organisation — required for ci-mcp and git-mcp tools */
    owner: zod_1.z.string(),
    /** Repository name — required for ci-mcp and git-mcp tools */
    repo: zod_1.z.string(),
    author: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime().optional(),
});
