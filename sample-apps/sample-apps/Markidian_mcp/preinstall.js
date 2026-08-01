import { execSync } from 'child_process';
import fs from 'fs';

try {
  const isWin = process.platform === 'win32';
  if (isWin) {
    if (fs.existsSync('setup.bat')) {
      execSync('setup.bat', { stdio: 'inherit' });
    }
  } else {
    if (fs.existsSync('setup.sh')) {
      execSync('bash ./setup.sh', { stdio: 'inherit' });
    }
  }

  if (fs.existsSync('scripts/patch-markitdown.js')) {
    execSync('node scripts/patch-markitdown.js', { stdio: 'inherit' });
  }
} catch (e) {
  console.warn('Preinstall setup notice: Python virtual environment setup warning:', e?.message || e);
}

process.exit(0);