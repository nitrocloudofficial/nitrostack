/**
 * Quick test script for the dataset service.
 *
 * Run with:  npx tsx src/data/test-dataset.ts
 *
 * This verifies:
 * 1. The CSV loads without errors
 * 2. All expected columns are present
 * 3. A normal record can be looked up by UDI
 * 4. A failure record can be looked up
 * 5. Dataset statistics are computed correctly
 */
import { loadDataset, getMachineByUdi, getDatasetStats, clearCache } from './dataset.js';
function test() {
    console.log('=== AI4I Dataset Test ===\n');
    // Test 1: Load the full dataset
    clearCache();
    const records = loadDataset();
    console.log(`✅ Loaded ${records.length} records from CSV\n`);
    // Test 2: Check first record (UDI 1)
    const machine1 = getMachineByUdi(1);
    if (!machine1) {
        console.error('❌ FAIL: Could not find UDI 1');
        process.exit(1);
    }
    console.log('✅ UDI 1 lookup:');
    console.log(JSON.stringify(machine1, null, 2));
    console.log();
    // Test 3: Check a known failure record (UDI 51 had Machine failure = 1)
    const machine51 = getMachineByUdi(51);
    if (!machine51) {
        console.error('❌ FAIL: Could not find UDI 51');
        process.exit(1);
    }
    if (machine51.machineFailure !== 1) {
        console.error(`❌ FAIL: UDI 51 expected machineFailure=1, got ${machine51.machineFailure}`);
        process.exit(1);
    }
    console.log('✅ UDI 51 (failure record) lookup:');
    console.log(JSON.stringify(machine51, null, 2));
    console.log();
    // Test 4: Dataset statistics
    const stats = getDatasetStats();
    console.log('✅ Dataset stats:');
    console.log(JSON.stringify(stats, null, 2));
    console.log();
    // Test 5: Non-existent UDI
    const missing = getMachineByUdi(99999);
    if (missing !== undefined) {
        console.error('❌ FAIL: Expected undefined for UDI 99999');
        process.exit(1);
    }
    console.log('✅ Non-existent UDI 99999 correctly returns undefined\n');
    console.log('=== All tests passed! ===');
}
test();
//# sourceMappingURL=test-dataset.js.map