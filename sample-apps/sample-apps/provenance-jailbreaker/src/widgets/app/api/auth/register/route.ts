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
    const crypto = await import('crypto');

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    const user = await UserModel.create({
      username,
      passwordHash,
      role: 'user' // Default to normal user, you can set yourself as admin manually in Mongo
    });
    
    return NextResponse.json({ success: true, message: 'User registered successfully!' });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
