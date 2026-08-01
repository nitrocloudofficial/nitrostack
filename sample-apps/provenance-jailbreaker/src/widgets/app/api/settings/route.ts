import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

function getMongoURI() {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nitroAppDB';
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(getMongoURI(), { serverSelectionTimeoutMS: 5000 });
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { AppSettingsModel } = await import('../../../../modules/audit/schemas/settings.schema');
    
    let settings = await AppSettingsModel.findOne();
    if (!settings) {
      settings = await AppSettingsModel.create({ logRetentionDays: 7 });
    }
    
    return NextResponse.json({ retentionDays: settings.logRetentionDays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { AppSettingsModel } = await import('../../../../modules/audit/schemas/settings.schema');
    const { retentionDays } = await req.json();
    
    if (typeof retentionDays !== 'number' || retentionDays < 1) {
      return NextResponse.json({ error: 'Invalid retention days' }, { status: 400 });
    }

    let settings = await AppSettingsModel.findOne();
    if (!settings) {
      settings = new AppSettingsModel();
    }
    
    settings.logRetentionDays = retentionDays;
    await settings.save();
    
    return NextResponse.json({ success: true, retentionDays: settings.logRetentionDays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
