import { NextResponse } from 'next/server';
import { OcrEngineService } from '../../../../../../services/ocr-engine.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { documents } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          error: 'No documents provided for OCR processing.',
          message: 'No documents provided for OCR processing.'
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ocrResult = await OcrEngineService.processSessionDocuments(documents);

    return NextResponse.json(
      {
        success: true,
        status: 'success',
        text: ocrResult.rawText,
        pages: ocrResult.pagesProcessed,
        confidence: ocrResult.confidence,
        ocrResult
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in POST /api/integrations/gmail/ocr:', error);
    const errorMessage = error?.message || 'OCR processing failed.';
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: errorMessage,
        message: errorMessage
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
