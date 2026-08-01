import { initDb } from './database.js';

console.log('🧹 Initializing clean 0-record database...');

try {
  initDb();
  console.log('✅ ClinicaMind clean 0-record database ready!');
} catch (err) {
  console.error('❌ Seeder error:', err);
}
