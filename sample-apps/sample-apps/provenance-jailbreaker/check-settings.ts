import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const { AppSettingsModel } = await import('./src/modules/audit/schemas/settings.schema.ts');
  
  const settings = await AppSettingsModel.findOne();
  if (settings) {
    console.log(`\n✅ DATABASE VERIFICATION: The current dump period (logRetentionDays) is strictly set to ${settings.logRetentionDays} days.\n`);
  } else {
    console.log('\n✅ DATABASE VERIFICATION: No custom setting found yet. Defaulting to 7 days.\n');
  }
  process.exit(0);
}

run();
