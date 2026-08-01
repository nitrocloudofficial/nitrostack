import { execSync } from 'child_process';
import os from 'os';

if (os.platform() === 'linux') {
  try {
    // Attempt to install openssl using apk, which is only available on Alpine Linux
    console.log('Checking for Alpine Linux environment...');
    execSync('apk add --no-cache openssl', { stdio: 'inherit' });
    console.log('Successfully installed openssl for Prisma compatibility.');
  } catch (err) {
    // Fail silently if apk is not found (e.g., Ubuntu/Debian) or permission denied
    console.log('Skipped apk install (not Alpine Linux or no permissions).');
  }
}
