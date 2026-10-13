import 'dotenv/config';
import { runPipeline } from './src/pipeline_runner4.ts';

(async () => {
  try {
    const result = await runPipeline('show all employee');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  }
})();
