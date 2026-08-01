import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { TranscriptService } from '../../../../../../services/transcript.service';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const transcripts = TranscriptService.getTranscriptsByVisit(params.id);
    return NextResponse.json({ success: true, count: transcripts.length, data: transcripts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch transcript' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.text || !body.speaker) {
      return NextResponse.json({ success: false, error: 'text and speaker are required' }, { status: 400 });
    }

    const added = TranscriptService.addTranscriptTurn({
      visitId: params.id,
      speaker: body.speaker,
      text: body.text,
      confidence: body.confidence,
      isFinal: body.isFinal
    });

    return NextResponse.json({ success: true, data: added }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to append transcript turn' }, { status: 500 });
  }
}
