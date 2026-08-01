import { NextResponse } from 'next/server';
import { AiExtractionService } from '../../../../../../services/ai-extraction.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawOcrText } = body;

    const extraction = await AiExtractionService.extractStructuredData(rawOcrText || '');

    return NextResponse.json({
      status: 'success',
      extraction
    });
  } catch (error: any) {
    console.error('Error in POST /api/integrations/gmail/extraction:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Extraction failed' }, { status: 500 });
  }
}
