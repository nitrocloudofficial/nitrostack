import 'dotenv/config';
import { CIService } from './dist/modules/ci/ci.service.js';

async function test() {
  const service = new CIService();
  try {
    console.log('Fetching graphrag context...');
    const result = await service.buildCiGraphragContext('VarunRajV28', 'omnitrace-demo-app', '30170825828');
    console.log('RESULT:', result);
  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();
