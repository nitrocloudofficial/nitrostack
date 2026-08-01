import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const STORAGE_DIR = path.resolve(process.cwd(), 'data');
const SESSION_FILE = path.join(STORAGE_DIR, 'intake_session.json');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadSession() {
  ensureDir();
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(sessionData: any) {
  ensureDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const session = loadSession();
    if (!session) {
      return NextResponse.json({ status: 'empty', message: 'No active intake processing session.' });
    }
    return NextResponse.json({ status: 'success', session });
  } catch (error: any) {
    console.error('Error in GET /api/integrations/gmail/session:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documents, sourceEmail, receivedTime } = body;

    const tempDir = path.resolve(process.cwd(), 'data', 'temp_attachments');

    const sessionId = `SESSION-INTAKE-${Date.now()}`;
    const session = {
      sessionId,
      createdAt: new Date().toISOString(),
      status: 'Ready for OCR',
      documentCount: documents?.length || 0,
      documents: documents || [],
      sourceEmail: sourceEmail || documents?.[0]?.sourceEmail || 'doctor@gmail.com',
      receivedTime: receivedTime || documents?.[0]?.uploadTime || new Date().toLocaleString(),
      temporaryStoragePath: tempDir
    };

    saveSession(session);

    return NextResponse.json({
      status: 'success',
      sessionId,
      session
    });
  } catch (error: any) {
    console.error('Error in POST /api/integrations/gmail/session:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
