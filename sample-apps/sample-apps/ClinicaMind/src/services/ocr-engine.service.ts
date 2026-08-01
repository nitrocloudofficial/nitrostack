import fs from 'fs';
import path from 'path';

export interface OcrDocumentResult {
  success: boolean;
  documentName: string;
  fileType: string;
  pagesProcessed: number;
  characterCount: number;
  confidence: string;
  rawText: string;
  error?: string;
}

export interface CombinedOcrResult {
  status: string;
  processingStatus: string;
  pagesProcessed: number;
  characterCount: number;
  confidence: string;
  rawText: string;
  documentsProcessed: number;
  results: OcrDocumentResult[];
}

export class OcrEngineService {
  /**
   * PDF & Image Text Extraction Pipeline.
   * - PDF: Attempts direct text extraction using pdf-parse.
   *        If pdf-parse succeeds, logs debug metrics and returns pdfData.text exactly.
   *        If pdf-parse throws, logs full exception and falls back to Tesseract OCR.
   * - PNG / JPG / JPEG: Always runs Tesseract OCR.
   * - No manual buffer parsing, no regex extraction, no placeholder text.
   */
  static async processDocument(filePath: string, fileName: string, fileType: string): Promise<OcrDocumentResult> {
    const sanitizedName = path.basename(fileName);
    const ext = fileType.toUpperCase();

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File not found on server at path "${filePath}". Cannot process missing file.`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✓ File received: ${sanitizedName}`);
    console.log(`✓ File type: ${ext}`);
    console.log(`✓ File size: ${fileBuffer.length} bytes`);

    let extractedText = '';
    let pagesProcessed = 1;
    let confidenceStr = '98.5%';

    const isPdf = ext === 'PDF' || sanitizedName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      console.log(`✓ PDF text extraction started for ${sanitizedName}`);

      let pdfParseError: any = null;

      try {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const pdfData = await pdfParse(fileBuffer);

        if (pdfData && typeof pdfData.text === 'string') {
          pagesProcessed = pdfData.numpages || 1;
          extractedText = pdfData.text;
          confidenceStr = '99.0% (pdf-parse)';

          // Debug logging required when pdf-parse succeeds
          console.log(`--- [pdf-parse Success Metrics] ---`);
          console.log(`pdf-parse version: ${pdfData.version || 'default'}`);
          console.log(`pdfData.numpages: ${pdfData.numpages}`);
          console.log(`pdfData.info: ${JSON.stringify(pdfData.info || {})}`);
          console.log(`pdfData.metadata: ${JSON.stringify(pdfData.metadata || {})}`);
          console.log(`pdfData.text.length: ${pdfData.text.length}`);
          console.log(`First 200 characters of pdfData.text:\n${pdfData.text.substring(0, 200)}`);
          console.log(`-----------------------------------`);
          console.log(`✓ Extraction complete for ${sanitizedName}`);
        }
      } catch (pdfErr: any) {
        pdfParseError = pdfErr;
        console.error(`[OcrEngineService] pdf-parse failed for ${sanitizedName}:`, pdfErr);
      }

      // If pdf-parse threw an error or returned empty text, run Tesseract OCR fallback
      if (!extractedText || extractedText.trim().length === 0) {
        console.log(`✓ OCR fallback started (Tesseract.js) for ${sanitizedName}`);
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');
          const { data } = await worker.recognize(fileBuffer);
          await worker.terminate();

          if (data && data.text && data.text.trim().length > 0) {
            extractedText = data.text;
            confidenceStr = data.confidence ? `${data.confidence.toFixed(1)}% (Tesseract OCR)` : '90.0%';
            console.log(`✓ Extraction complete for ${sanitizedName} via Tesseract OCR`);
          } else {
            throw new Error(`Tesseract OCR returned empty text for "${sanitizedName}".`);
          }
        } catch (tessErr: any) {
          console.error(`[OcrEngineService] Tesseract OCR failed for ${sanitizedName}:`, tessErr);
          const combinedMsg = pdfParseError
            ? `pdf-parse error: ${pdfParseError?.message || pdfParseError}; Tesseract error: ${tessErr?.message || tessErr}`
            : `Tesseract error: ${tessErr?.message || tessErr}`;
          throw new Error(`Text extraction failed for "${sanitizedName}": ${combinedMsg}`);
        }
      }
    } else {
      // PNG / JPG / JPEG / Image files
      console.log(`✓ OCR fallback started (Tesseract.js) for image file ${sanitizedName}`);
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const { data } = await worker.recognize(fileBuffer);
        await worker.terminate();

        if (data && data.text && data.text.trim().length > 0) {
          extractedText = data.text;
          confidenceStr = data.confidence ? `${data.confidence.toFixed(1)}% (Tesseract OCR)` : '95.0%';
          console.log(`✓ Extraction complete for ${sanitizedName} via Tesseract OCR`);
        } else {
          throw new Error(`Tesseract OCR returned empty text for image "${sanitizedName}".`);
        }
      } catch (imgErr: any) {
        console.error(`[OcrEngineService] Image Tesseract failed for ${sanitizedName}:`, imgErr);
        throw new Error(`Image OCR extraction failed for "${sanitizedName}": ${imgErr?.message || imgErr}`);
      }
    }

    return {
      success: true,
      documentName: sanitizedName,
      fileType: ext,
      pagesProcessed,
      characterCount: extractedText.length,
      confidence: confidenceStr,
      rawText: extractedText
    };
  }

  /**
   * Processes all selected session documents.
   */
  static async processSessionDocuments(
    documents: Array<{ fileName: string; fileType?: string; localPath?: string }>
  ): Promise<CombinedOcrResult> {
    const tempDir = path.resolve(process.cwd(), 'data', 'temp_attachments');
    const results: OcrDocumentResult[] = [];
    let totalPages = 0;
    let totalChars = 0;
    const mergedTexts: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      let targetPath = doc.localPath || '';

      if (!targetPath || !fs.existsSync(targetPath)) {
        const cleanName = path.basename(doc.fileName);
        const direct = path.join(tempDir, cleanName);
        if (fs.existsSync(direct)) {
          targetPath = direct;
        } else if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          const match = files.find(f => f === cleanName || f.endsWith(`_${cleanName}`) || f.toLowerCase().includes(cleanName.toLowerCase()));
          if (match) {
            targetPath = path.join(tempDir, match);
          }
        }
      }

      if (!targetPath || !fs.existsSync(targetPath)) {
        throw new Error(`Document "${doc.fileName}" not found in server storage directory (${tempDir}).`);
      }

      const docResult = await this.processDocument(targetPath, doc.fileName, doc.fileType || 'PDF');
      results.push(docResult);

      if (docResult.success) {
        totalPages += docResult.pagesProcessed;
        totalChars += docResult.characterCount;
        mergedTexts.push(docResult.rawText);
      }
    }

    const combinedRawText = mergedTexts.join('\n\n' + '='.repeat(60) + '\n\n');
    const avgConfidence = results.length > 0 ? results[0].confidence : '98.5%';

    return {
      status: 'success',
      processingStatus: 'OCR Complete ✓',
      pagesProcessed: totalPages,
      characterCount: totalChars,
      confidence: avgConfidence,
      rawText: combinedRawText,
      documentsProcessed: results.length,
      results
    };
  }
}
