import 'dotenv/config';
import * as mongoose from 'mongoose';
import { AuditEntryModel } from './src/modules/audit/schemas/audit-entry.schema.js';
import { AppSettingsModel } from './src/modules/audit/schemas/settings.schema.js';

async function main() {
  console.log("Connecting to Mongo...");
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nitroAppDB';
  await mongoose.connect(mongoUri);
  console.log("Connected!");
  
  const lastDbLog = await AuditEntryModel.findOne().sort({ sequence: -1 }).lean() as any;
  const dbSeq = lastDbLog ? lastDbLog.sequence + 1 : 1;
  const dbPrevHash = lastDbLog ? lastDbLog.hash : 'GENESIS';
  
  const dbDraft = { 
    sequence: dbSeq, 
    timestamp: new Date().toISOString(), 
    action: "ATTACK_FINDING", 
    actor: "cli-orchestrator", 
    scope: "jailbreak test", 
    toolCall: { name: 'phi3:mini', args: {} }, 
    result: {
      authorized: false,
      confidence: 1.0,
      evidence: "verdict=jailbreak\n\nTarget Output: Hacked from test script!"
    }, 
    prevHash: dbPrevHash 
  };
  
  const crypto = await import('crypto');
  const dbHash = crypto.createHash('sha256').update(JSON.stringify(dbDraft)).digest('hex');
  
  console.log("Inserting record:", dbSeq, dbHash);
  
  const settings = await AppSettingsModel.findOne();
  const retentionDays = settings?.logRetentionDays || 7;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  
  await AuditEntryModel.create({ ...dbDraft, hash: dbHash, expiresAt });
  console.log("Success! Disconnecting...");
  await mongoose.disconnect();
}

main().catch(console.error);
