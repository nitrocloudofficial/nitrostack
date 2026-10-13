import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mongoose Schema for xAI Notifications
const AlertSchema = new mongoose.Schema({
  logId: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const AlertModel = mongoose.models.SecurityAlert || mongoose.model('SecurityAlert', AlertSchema);

export async function analyzeWithXAI(log: any) {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    console.log('⚠️ XAI_API_KEY is not set. Skipping xAI analysis.');
    return;
  }

  console.log(`🔍 Sending suspicious log [Seq: ${log.sequence}] to xAI for threat analysis...`);

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiKey}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are an elite cybersecurity AI. Analyze the provided red-team audit log and generate a brief, urgent 1-2 sentence security notification.'
          },
          {
            role: 'user',
            content: `Suspicious Log Data: ${JSON.stringify(log)}`
          }
        ]
      })
    });

    const data: any = await response.json();
    const alertMessage = data.choices[0].message.content;

    console.log(`\n🚨 xAI THREAT ALERT: ${alertMessage}\n`);

    // Save notification to MongoDB
    await AlertModel.create({
      logId: log._id,
      message: alertMessage
    });
    console.log('✅ Notification saved to database!');

  } catch (error) {
    console.error('❌ Failed to fetch xAI analysis:', error);
  }
}

// Standalone runner
async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const { AuditEntryModel } = await import('./schemas/audit-entry.schema.js');
  
  // Find logs that were marked as unauthorized
  const suspiciousLogs = await AuditEntryModel.find({ 'result.authorized': false }).limit(5).lean();
  
  if (suspiciousLogs.length === 0) {
    console.log('✅ No suspicious logs found in the database.');
  } else {
    for (const log of suspiciousLogs) {
      await analyzeWithXAI(log);
    }
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
