import { initDb } from './database.js';

console.log('🔄 Running database migrations...');
try {
  const db = initDb();
  console.log('✅ ClinicaMind Database Schema initialized & verified successfully!');
  db.close();
} catch (error) {
  console.error('❌ Database migration error:', error);
  process.exit(1);
}
