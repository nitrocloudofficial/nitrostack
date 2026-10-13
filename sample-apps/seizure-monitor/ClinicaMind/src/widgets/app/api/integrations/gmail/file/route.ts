import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePathParam = searchParams.get('path');
    const fileNameParam = searchParams.get('file');

    if (!filePathParam && !fileNameParam) {
      return NextResponse.json({ status: 'error', message: 'Missing file path parameter.' }, { status: 400 });
    }

    const tempDir = path.resolve(process.cwd(), 'data', 'temp_attachments');
    let targetPath = '';

    if (filePathParam) {
      const resolved = path.resolve(filePathParam);
      if (fs.existsSync(resolved)) {
        targetPath = resolved;
      }
    }

    if (!targetPath && fileNameParam) {
      const cleanName = path.basename(fileNameParam);
      const directPath = path.join(tempDir, cleanName);
      if (fs.existsSync(directPath)) {
        targetPath = directPath;
      } else if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const match = files.find(f => f === cleanName || f.endsWith(`_${cleanName}`) || f.toLowerCase().includes(cleanName.toLowerCase()));
        if (match) {
          targetPath = path.join(tempDir, match);
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return NextResponse.json({ status: 'error', message: 'File not found on server.' }, { status: 404 });
    }

    const buffer = fs.readFileSync(targetPath);
    const ext = path.extname(targetPath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(targetPath)}"`
      }
    });
  } catch (error: any) {
    console.error('Error serving file:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
