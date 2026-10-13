import 'dotenv/config';
import { ValidationTools } from '../src/modules/validation/validation.tools.js';

async function runTest() {
  console.log('Initializing Validation Engine...');
  const tools = new ValidationTools();
  
  const testInput = {
    heuristicId: 'H-001',
    rule: 'IF machine_vibration > 120 AND temperature > 90 THEN reject_part = true',
    datasetUri: 's3://manufacturing-logs/sensor_data.csv'
  };

  console.log(`\nTesting Rule Validation for:\n"${testInput.rule}"\n`);
  console.log('Sending payload for Orchestrator LLM execution...');
  
  // Mock ExecutionContext since we are testing outside of the MCP server request lifecycle
  const mockContext: any = {
    logger: {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string) => console.log(`[ERROR] ${msg}`)
    }
  };

  try {
    const result = await tools.validateHeuristic(testInput, mockContext);
    console.log('\nValidation Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\nTest Failed:', error);
  }
}

runTest();
