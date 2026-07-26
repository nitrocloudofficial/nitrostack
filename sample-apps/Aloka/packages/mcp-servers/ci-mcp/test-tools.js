import 'dotenv/config';
import { CIService } from './dist/modules/ci/ci.service.js';
import { CITools } from './dist/modules/ci/ci.tools.js';

async function test() {
  process.env.GITHUB_TOKEN = '';
  const service = new CIService();
  const tools = new CITools(service);

  try {
    console.log('Fetching graphrag context via CITools...');
    const result = await tools.getCiGraphragContext({
      owner: 'VarunRajV28',
      repo: 'omnitrace-demo-app',
      run_id: '30170825828'
    });
    console.log('RESULT:', result);
  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();
