import { WorkflowTools } from './src/modules/workflow/workflow.tools.js';
import { HumanApprovalGuard, approvalRegistry } from './src/guards/human-approval.guard.js';

async function runTest4() {
    console.log('🧪 Starting Execution Test for Person 4 (Workflow & Human Approval Guard)...\n');

    const workflowTools = new WorkflowTools();
    const guard = new HumanApprovalGuard();

    // Test 1: Create a Change Request
    console.log('--------------------------------------------------');
    console.log('📝 Test 1: Creating a pending Change Request...');
    const cr = await workflowTools.create({
        planId: 'plan-1784980037354',
        approver: 'security-admin@company.com',
    });
    console.log('Change Request Created:', cr);

    // Test 2: Test Guard behavior BEFORE human approval decision
    console.log('\n--------------------------------------------------');
    console.log('🔒 Test 2: Testing HumanApprovalGuard BEFORE decision...');
    const canProceedBefore = guard.canActivate({ input: { requestId: cr.requestId } } as any);
    console.log(`Guard Decision: ${canProceedBefore} (Expected: false - execution blocked)`);

    // Test 3: Record a Human Approval Decision
    console.log('\n--------------------------------------------------');
    console.log('✅ Test 3: Recording Human Approval Decision...');
    const approveResult = await workflowTools.approve({
        requestId: cr.requestId,
        decision: 'approved',
    });
    console.log('Approve Result:', approveResult);

    // Test 4: Test Guard behavior AFTER human approval decision
    console.log('\n--------------------------------------------------');
    console.log('🔓 Test 4: Testing HumanApprovalGuard AFTER decision...');
    const canProceedAfter = guard.canActivate({ input: { requestId: cr.requestId } } as any);
    console.log(`Guard Decision: ${canProceedAfter} (Expected: true - execution allowed)`);

    console.log('\n--------------------------------------------------');
    console.log('🎉 PERSON 4 TEST COMPLETE!');
}

runTest4().catch((err) => console.error('❌ Test Failed:', err));