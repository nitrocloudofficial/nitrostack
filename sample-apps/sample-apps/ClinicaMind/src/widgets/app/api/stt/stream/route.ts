import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'deprecated',
    message: 'The HTTP POST + SSE STT route has been deleted and replaced with the bi-directional STT WebSocket Server running on ws://localhost:3002.'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'deprecated',
    message: 'The HTTP POST + SSE STT route has been deleted and replaced with the bi-directional STT WebSocket Server running on ws://localhost:3002.'
  }, { status: 410 });
}
