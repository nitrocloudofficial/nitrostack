import 'dotenv/config';
import * as os from 'os';

/**
 * Debug Script 3: test-env.ts
 *
 * Verifies environment variables presence and system information without exposing secrets.
 */
function testEnvironment() {
  console.log('==========================================================');
  console.log('ENVIRONMENT DIAGNOSTICS & SYSTEM INFORMATION');
  console.log('==========================================================');
  console.log(`Node Version               : ${process.version}`);
  console.log(`Operating System           : ${process.platform} (${process.arch}) - ${os.type()} ${os.release()}`);
  console.log(`Current Working Directory  : ${process.cwd()}`);
  console.log('----------------------------------------------------------');

  const checkVar = (varName: string): string => {
    const val = process.env[varName];
    if (!val || val.trim() === '' || val.includes('<username>') || val.includes('placeholder')) {
      return 'MISSING';
    }
    return 'FOUND';
  };

  console.log(`MONGODB_URI                : ${checkVar('MONGODB_URI')}`);
  console.log(`DATABASE_NAME              : ${checkVar('DATABASE_NAME')}`);
  console.log(`SUPABASE_URL               : ${checkVar('SUPABASE_URL')}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY  : ${checkVar('SUPABASE_SERVICE_ROLE_KEY')}`);
  console.log(`SUPABASE_STORAGE_BUCKET    : ${checkVar('SUPABASE_STORAGE_BUCKET')}`);
  console.log('==========================================================');
}

testEnvironment();
