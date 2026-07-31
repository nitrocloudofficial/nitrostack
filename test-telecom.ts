import { TelecomTools } from './src/modules/aegis/tools/telecom.tools.js';

async function run() {
  console.log('--------------------------------------------------');
  console.log('🚀 Running Telecom Tools...');
  console.log('--------------------------------------------------\n');

  const tools = new TelecomTools();

  // Mock Execution Context for logging
  const mockContext: any = {
    logger: {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      warn: (msg: string) => console.log(`[WARN] ${msg}`),
      error: (msg: string) => console.log(`[ERROR] ${msg}`),
    },
  };

  console.log('1️⃣ Executing analyzeTelecomMetadata()...');
  const metadataResult = await tools.analyzeTelecomMetadata({}, mockContext);
  console.log('Result:\n', JSON.stringify(metadataResult, null, 2));

  console.log('\n2️⃣ Executing verifyVoiceDeepfake()...');
  const deepfakeResult = await tools.verifyVoiceDeepfake({ call_id: 'TEL-9948-AX' }, mockContext);
  console.log('Result:\n', JSON.stringify(deepfakeResult, null, 2));

  console.log('\n--------------------------------------------------');
  console.log('✅ Telecom Tools executed successfully!');
  console.log('--------------------------------------------------');
}

run().catch((err) => {
  console.error('Execution failed:', err);
});
