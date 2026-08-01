import { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { MockCloudService } from '../../services/mock-cloud.service.js';

export interface RemediationPlan {
    planId: string;
    findingId: string;
    resourceId: string;
    executionMode: 'DRY_RUN_ONLY';
    terraformHcl: string;
    blastRadius: string;
    rollbackStep: string;
}

function Tool(_options: { name: string; description: string; inputSchema: z.ZodSchema }): any {
    return function (..._args: any[]): any { };
}

export class RemediationTools {
    private readonly cloudService = new MockCloudService();

    @Tool({
        name: 'generate_remediation_plan',
        description: 'Drafts a non-destructive Terraform fix for a security finding',
        inputSchema: z.object({
            findingId: z.string().describe('The finding ID to generate a plan for'),
        }),
    })
    async generatePlan(
        input: { findingId: string },
        _ctx?: ExecutionContext
    ): Promise<RemediationPlan | { error: string }> {
        const rawFindings = await this.cloudService.getSecurityFindings();
        const finding: any = rawFindings.find(
            (f: any) => (f.findingId ?? f.id) === input.findingId
        );

        if (!finding) {
            return { error: `Security finding ID '${input.findingId}' was not found in inventory.` };
        }

        const findingId = finding.findingId ?? finding.id;
        const resClean = finding.resourceId.replace(/[^a-zA-Z0-9]/g, '_');
        let terraformHcl = '';
        let blastRadius = '';
        let rollbackStep = '';

        if (finding.title.toLowerCase().includes('s3') || findingId.includes('s3')) {
            terraformHcl = [
                `# Remediation for S3 Public Bucket Exposure (${finding.resourceId})`,
                `resource "aws_s3_bucket_public_access_block" "block_public_${resClean}" {`,
                `  bucket                  = "${finding.resourceId}"`,
                `  block_public_acls       = true`,
                `  block_public_policy     = true`,
                `  ignore_public_acls      = true`,
                `  restrict_public_buckets = true`,
                `}`
            ].join('\n');
            blastRadius = 'Low impact. Restricts public bucket access; internal application IAM roles remain unaffected.';
            rollbackStep = 'Set block_public_policy = false via Terraform apply if public read is explicitly required.';
        } else if (finding.title.toLowerCase().includes('ssh') || findingId.includes('sg')) {
            terraformHcl = [
                `# Remediation for Open SSH Security Group (${finding.resourceId})`,
                `resource "aws_security_group_rule" "restrict_ssh_${resClean}" {`,
                `  type              = "ingress"`,
                `  from_port         = 22`,
                `  to_port           = 22`,
                `  protocol          = "tcp"`,
                `  cidr_blocks       = ["10.0.0.0/8"]`,
                `  security_group_id = "${finding.resourceId}"`,
                `}`
            ].join('\n');
            blastRadius = 'Medium impact. External SSH connections outside corporate CIDR 10.0.0.0/8 will be severed.';
            rollbackStep = 'Restore 0.0.0.0/0 ingress rule in emergency rollback state.';
        } else {
            terraformHcl = [
                `# Generic Policy Patch (${finding.resourceId})`,
                `resource "aws_resource_policy_attachment" "secure_${resClean}" {`,
                `  target_id = "${finding.resourceId}"`,
                `}`
            ].join('\n');
            blastRadius = 'Low impact. Configured scoped IAM policy boundary guardrail.';
            rollbackStep = 'Revert IAM policy attachment to previous version revision.';
        }

        return {
            planId: `plan-${Date.now()}`,
            findingId,
            resourceId: finding.resourceId,
            executionMode: 'DRY_RUN_ONLY',
            terraformHcl,
            blastRadius,
            rollbackStep,
        };
    }
}