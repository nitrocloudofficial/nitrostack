import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

function getMongoURI() {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nitroAppDB';
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(getMongoURI(), { serverSelectionTimeoutMS: 5000 });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { username, password } = await req.json();
    
    const { UserModel } = await import('../../../../../modules/auth/schemas/user.schema');
    const { AuditEntryModel } = await import('../../../../../modules/audit/schemas/audit-entry.schema');
    const { AppSettingsModel } = await import('../../../../../modules/audit/schemas/settings.schema');
    const crypto = await import('crypto');

    // Helper to log audit events
    const logAuthEvent = async (action: string, isSuccess: boolean, evidence: string) => {
      const lastLog = await AuditEntryModel.findOne().sort({ sequence: -1 }).lean() as any;
      const sequence = lastLog ? lastLog.sequence + 1 : 1;
      const prevHash = lastLog ? lastLog.hash : 'GENESIS';
      
      const draft = {
        sequence, 
        timestamp: new Date().toISOString(), 
        action, 
        actor: username || 'unknown',
        scope: 'dashboard', 
        toolCall: { name: 'Authentication System', args: {} },
        result: { authorized: isSuccess, confidence: 1.0, evidence },
        prevHash
      };
      
      const hash = crypto.createHash('sha256').update(JSON.stringify(draft)).digest('hex');
      const settings = await AppSettingsModel.findOne();
      const retentionDays = settings?.logRetentionDays || 7;
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
      
      await AuditEntryModel.create({ ...draft, hash, expiresAt });
    };

    const user = await UserModel.findOne({ username });
    if (!user) {
      await logAuthEvent('login_failed', false, `Failed login attempt (User not found) for: ${username}`);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) {
      await logAuthEvent('login_failed', false, `Failed login attempt (Wrong password) for: ${username}`);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Success
    await logAuthEvent('login_success', true, `Successful dashboard login for admin: ${username}`);
    
    // In a real app, generate a JWT here. For this demo, we'll return a simple token.
    const token = crypto.randomBytes(16).toString('hex');
    
    return NextResponse.json({ 
      token, 
      user: { username: user.username, role: user.role } 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
