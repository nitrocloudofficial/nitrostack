import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const { AuditEntryModel } = await import('./src/modules/audit/schemas/audit-entry.schema.ts');
  
  await AuditEntryModel.deleteMany({});
  
  const mockLogs = [
    {
      sequence: 1,
      timestamp: new Date().toISOString(),
      action: "simulate_attack",
      actor: "red_team",
      scope: "global",
      toolCall: { name: "phi3:mini", args: {} },
      result: { authorized: true, confidence: 0.99, evidence: "Benign request" },
      hash: crypto.randomBytes(32).toString('hex'),
      prevHash: "GENESIS"
    },
    {
      sequence: 2,
      timestamp: new Date().toISOString(),
      action: "simulate_attack",
      actor: "red_team",
      scope: "global",
      toolCall: { name: "qwen2.5:3b", args: {} },
      result: { authorized: false, confidence: 0.98, evidence: "Jailbreak attempt detected: Ignore previous instructions." },
      hash: crypto.randomBytes(32).toString('hex'),
      prevHash: crypto.randomBytes(32).toString('hex')
    }
  ];

  await AuditEntryModel.insertMany(mockLogs);
  console.log('✅ Mock logs generated in MongoDB Atlas successfully!');
  process.exit(0);
}

run();
