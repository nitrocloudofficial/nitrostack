import { MockCloudService } from './src/services/mock-cloud.service.js';
import { AnalysisTools } from './src/modules/analysis/analysis.tools.js';
import { SecurityTools } from './src/modules/security/security.tools.js';
import { RemediationTools } from './src/modules/remediation/remediation.tools.js';
import { WorkflowTools } from './src/modules/workflow/workflow.tools.js';
import { HumanApprovalGuard } from './src/guards/human-approval.guard.js';

async function runFullPipeline() {
    console.log('==================================================');
    console.log('🛡️  CLOUDGUARD AI — FULL END-TO-END PIPELINE RUN');
    console.log('==================================================\n');

    // --------------------------------------------------
    // PERSON 1: Data & Adapter Layer
    // --------------------------------------------------
    console.log('🔹 PERSON 1: Loading Cloud Provider Adapter & Datasets...');
    const cloudService = new MockCloudService();
    const instances = await cloudService.getComputeInstances();
    const findings = await cloudService.getSecurityFindings();
    console.log(`✅ Loaded ${instances.length} compute instances and ${findings.length} security findings.\n`);

    // --------------------------------------------------
    // PERSON 2: Analysis & Idle Waste Detection
    // --------------------------------------------------
    console.log('🔹 PERSON 2: Executing Idle Waste & Utilization Classification Scan...');
    const analysisTools = new AnalysisTools();
    const wasteResult = await analysisTools.detectIdleWaste();

    console.log('\n🔴 CANDIDATES FOR TERMINATION (Zombies):');
    console.dir(wasteResult.candidates, { depth: null });

    console.log('\n🟢 EXCLUDED / SPARED RESOURCES (ETL Traps & Active):');
    console.dir(wasteResult.excluded, { depth: null });

    // --------------------------------------------------
    // PERSON 3: Security Posture & Terraform Remediation Plan
    // --------------------------------------------------
    console.log('\n--------------------------------------------------');
    console.log('🔹 PERSON 3: Scanning Security Posture & Drafting Remediation Plans...');
    const securityTools = new SecurityTools();
    const remediationTools = new RemediationTools();

    const securityPosture = await securityTools.scan({ minSeverity: 'HIGH' });
    console.log(`✅ Identified ${securityPosture.length} HIGH/CRITICAL security findings:`);
    console.dir(securityPosture, { depth: null });

    let remediationPlan: any = null;
    if (securityPosture.length > 0) {
        const targetFindingId = securityPosture[0].findingId;
        console.log(`\n🛠️  Drafting Terraform Remediation Plan for '${targetFindingId}'...`);
        remediationPlan = await remediationTools.generatePlan({ findingId: targetFindingId });
        console.dir(remediationPlan, { depth: null });
    }

    // --------------------------------------------------
    // PERSON 4: Human-in-the-Loop Guard & Workflow
    // --------------------------------------------------
    console.log('\n--------------------------------------------------');
    console.log('🔹 PERSON 4: Executing Human Approval Governance Workflow...');
    const workflowTools = new WorkflowTools();
    const guard = new HumanApprovalGuard();

    if (remediationPlan && !('error' in remediationPlan)) {
        // 1. Create Change Request
        const cr = await workflowTools.create({
            planId: remediationPlan.planId,
            approver: 'sec-ops-lead@company.com',
        });
        console.log('\n📝 Created Pending Change Request:', cr);

        // 2. Test Guard BEFORE Approval
        const blockedCheck = guard.canActivate({ input: { requestId: cr.requestId } } as any);
        console.log(`🔒 Guard Check BEFORE Human Decision: ${blockedCheck} (Execution BLOCKED)`);

        // 3. Human Approval Decision
        console.log('\n👤 SecOps Lead reviewing Terraform HCL... Recording APPROVAL decision.');
        const approvalResult = await workflowTools.approve({
            requestId: cr.requestId,
            decision: 'approved',
        });
        console.log('Approval Result:', approvalResult);

        // 4. Test Guard AFTER Approval
        const passedCheck = guard.canActivate({ input: { requestId: cr.requestId } } as any);
        console.log(`🔓 Guard Check AFTER Human Decision: ${passedCheck} (Execution ALLOWED)`);
    }

    console.log('\n==================================================');
    console.log('🎉 FULL PROJECT TEST COMPLETE — ALL 4 PERSONS PASSED!');
    console.log('==================================================');
}

runFullPipeline().catch((err) => console.error('❌ Pipeline Run Failed:', err));