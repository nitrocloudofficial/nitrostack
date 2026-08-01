import { AnalysisTools } from './src/modules/analysis/analysis.tools.js';

async function runExecutionTest() {
    console.log('🧪 Starting Execution Test for Person 2 (Analysis Module)...\n');
    const tools = new AnalysisTools();

    // Test 1: Single Resource Analysis (ETL Instance)
    console.log('--------------------------------------------------');
    console.log('🔍 Test 1: Analyzing nightly-etl-runner (i-0e9d8c7b6a5f4e3d2)...');
    const etlResult = await tools.analyze({ resourceId: 'i-0e9d8c7b6a5f4e3d2' });
    console.log('Result:', JSON.stringify(etlResult, null, 2));

    // Test 2: Detect Idle Waste across all resources
    console.log('\n--------------------------------------------------');
    console.log('🔍 Test 2: Running detect_idle_waste scan...');
    const wasteScan = await tools.detectIdleWaste();

    console.log('\n🔴 CANDIDATES FOR TERMINATION (Zombies):');
    console.dir(wasteScan.candidates, { depth: null });

    console.log('\n🟢 EXCLUDED / SPARED RESOURCES (ETL & Active):');
    console.dir(wasteScan.excluded, { depth: null });

    console.log('\n--------------------------------------------------');
    console.log('🎉 TEST COMPLETE!');
}

runExecutionTest().catch((err) => console.error('❌ Test Execution Failed:', err));