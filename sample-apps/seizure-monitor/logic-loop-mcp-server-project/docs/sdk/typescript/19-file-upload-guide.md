# File Upload Guide

## Overview

NitroStack supports file uploads through base64-encoded content passed to tools. This guide explains how to handle file uploads in your MCP tools, including processing images, documents, and other file types.

## How File Uploads Work

When a user uploads a file through an MCP client (like NitroStudio), the file is:

1. **Encoded** as base64 string
2. **Passed** to the tool via input parameters
3. **Decoded** and processed by your tool

## Tool Schema for File Uploads

Define your tool's input schema to accept file data:

```typescript
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export class FileTools {
  @Tool({
    name: 'process_file',
    description: 'Process an uploaded file',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content')
    })
  })
  async processFile(input: any, ctx: ExecutionContext) {
    // File processing logic here
  }
}
```

## Decoding Base64 Files

Files can be sent in two formats:

### Format 1: Data URL
```
data:image/png;base64,iVBORw0KGgo...
```

### Format 2: Raw Base64
```
iVBORw0KGgo...
```

### Universal Decoder

Handle both formats with this pattern:

```typescript
function decodeBase64File(content: string): Buffer {
  // Check for data URL format
  const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches && matches.length === 3) {
    // Data URL format - extract base64 portion
    return Buffer.from(matches[2], 'base64');
  } else {
    // Raw base64 format
    return Buffer.from(content, 'base64');
  }
}
```

## Complete File Upload Example

Here's a complete example from the starter template:

```typescript
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export class FileTools {
  @Tool({
    name: 'convert_temperature',
    description: 'Convert temperature units based on file content or direct input',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content'),
      value: z.number().optional().describe('Temperature value to convert'),
      from_unit: z.enum(['C', 'F']).optional().describe('Unit to convert from'),
      to_unit: z.enum(['C', 'F']).optional().describe('Unit to convert to')
    })
  })
  async convertTemperature(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Processing file', {
      name: input.file_name,
      type: input.file_type
    });

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, input.file_name);

    // Decode and save file
    if (input.file_content) {
      try {
        const matches = input.file_content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer;

        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(input.file_content, 'base64');
        }

        fs.writeFileSync(filePath, buffer);
        ctx.logger.info(`Saved file to ${filePath}`);
      } catch (e) {
        ctx.logger.error('Failed to save file', { 
          error: e instanceof Error ? e.message : String(e) 
        });
      }
    }

    return {
      status: 'success',
      message: `File ${input.file_name} processed successfully`,
      saved_path: filePath,
      file_type: input.file_type
    };
  }
}
```

## Processing Different File Types

### Images

```typescript
import sharp from 'sharp';  // npm install sharp

@Tool({
  name: 'process_image',
  description: 'Process and resize an uploaded image',
  inputSchema: z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_content: z.string(),
    width: z.number().optional().describe('Target width'),
    height: z.number().optional().describe('Target height')
  })
})
async processImage(input: any, ctx: ExecutionContext) {
  const buffer = this.decodeBase64(input.file_content);
  
  // Validate image type
  if (!input.file_type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Process with sharp
  const processed = await sharp(buffer)
    .resize(input.width || 800, input.height || 600)
    .toBuffer();
  
  // Save processed image
  const outputPath = path.join('uploads', `processed_${input.file_name}`);
  fs.writeFileSync(outputPath, processed);
  
  return {
    status: 'success',
    original_size: buffer.length,
    processed_size: processed.length,
    output_path: outputPath
  };
}
```

### PDFs

```typescript
import pdf from 'pdf-parse';  // npm install pdf-parse

@Tool({
  name: 'extract_pdf_text',
  description: 'Extract text from a PDF file',
  inputSchema: z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_content: z.string()
  })
})
async extractPdfText(input: any, ctx: ExecutionContext) {
  const buffer = this.decodeBase64(input.file_content);
  
  if (input.file_type !== 'application/pdf') {
    throw new Error('File must be a PDF');
  }
  
  const data = await pdf(buffer);
  
  return {
    status: 'success',
    pages: data.numpages,
    text: data.text,
    info: data.info
  };
}
```

### CSV Files

```typescript
import { parse } from 'csv-parse/sync';  // npm install csv-parse

@Tool({
  name: 'parse_csv',
  description: 'Parse a CSV file and return data',
  inputSchema: z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_content: z.string(),
    has_headers: z.boolean().default(true)
  })
})
async parseCsv(input: any, ctx: ExecutionContext) {
  const buffer = this.decodeBase64(input.file_content);
  const content = buffer.toString('utf-8');
  
  const records = parse(content, {
    columns: input.has_headers,
    skip_empty_lines: true
  });
  
  return {
    status: 'success',
    row_count: records.length,
    data: records
  };
}
```

## File Validation

Always validate uploaded files:

```typescript
interface FileValidation {
  maxSize?: number;        // Max file size in bytes
  allowedTypes?: string[]; // Allowed MIME types
  allowedExtensions?: string[]; // Allowed extensions
}

function validateFile(
  fileName: string,
  fileType: string,
  content: string,
  validation: FileValidation
): void {
  // Check extension
  if (validation.allowedExtensions) {
    const ext = path.extname(fileName).toLowerCase();
    if (!validation.allowedExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} not allowed`);
    }
  }
  
  // Check MIME type
  if (validation.allowedTypes) {
    if (!validation.allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} not allowed`);
    }
  }
  
  // Check size (base64 is ~33% larger than original)
  if (validation.maxSize) {
    const estimatedSize = (content.length * 3) / 4;
    if (estimatedSize > validation.maxSize) {
      throw new Error(`File exceeds maximum size of ${validation.maxSize} bytes`);
    }
  }
}
```

### Usage

```typescript
@Tool({
  name: 'upload_document',
  description: 'Upload a document',
  inputSchema: z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_content: z.string()
  })
})
async uploadDocument(input: any, ctx: ExecutionContext) {
  // Validate file
  validateFile(input.file_name, input.file_type, input.file_content, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg'],
    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg']
  });
  
  // Process file...
}
```

## Security Best Practices

### 1. Sanitize File Names

```typescript
function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let safe = fileName.replace(/\.\./g, '');
  
  // Remove special characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }
  
  return safe;
}
```

### 2. Use Dedicated Upload Directory

```typescript
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads stay in designated directory
function getSecureUploadPath(fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  const uploadPath = path.join(UPLOAD_DIR, safeName);
  
  // Verify path is still within upload directory
  if (!uploadPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Invalid file path');
  }
  
  return uploadPath;
}
```

### 3. Scan for Malware

For production systems, consider scanning uploads:

```typescript
import { scanFile } from 'your-antivirus-scanner';

async function processUpload(content: string, fileName: string) {
  const buffer = decodeBase64(content);
  const tempPath = path.join('/tmp', fileName);
  
  fs.writeFileSync(tempPath, buffer);
  
  const scanResult = await scanFile(tempPath);
  if (scanResult.infected) {
    fs.unlinkSync(tempPath);
    throw new Error('Malware detected in uploaded file');
  }
  
  // Move to final location
  // ...
}
```

### 4. Limit File Sizes

Set reasonable limits:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (buffer.length > MAX_FILE_SIZE) {
  throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
}
```

## Storing Files

### Local Storage

```typescript
const uploadsDir = path.join(process.cwd(), 'uploads');
fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
```

### Cloud Storage (S3)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

async function uploadToS3(buffer: Buffer, key: string) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer
  }));
  
  return `s3://${process.env.S3_BUCKET}/${key}`;
}
```

## Testing File Uploads

### In NitroStudio

1. Open the Chat interface
2. Click the attachment icon
3. Select a file
4. Send your message

The file will be encoded and sent to your tool.

### Manual Testing

```typescript
// Test with base64 encoded file
const testInput = {
  file_name: 'test.txt',
  file_type: 'text/plain',
  file_content: Buffer.from('Hello, World!').toString('base64')
};

const result = await tool.processFile(testInput, ctx);
```

## Troubleshooting

### File Not Decoding

**Issue**: Base64 decoding fails

**Solution**: Check for padding issues:

```typescript
function fixBase64Padding(str: string): string {
  // Add missing padding
  while (str.length % 4) {
    str += '=';
  }
  return str;
}
```

### Memory Issues with Large Files

**Issue**: Large files cause memory problems

**Solution**: Use streaming for large files:

```typescript
import { Readable } from 'stream';

function base64ToStream(base64: string): Readable {
  const buffer = Buffer.from(base64, 'base64');
  return Readable.from(buffer);
}
```

### File Extension Mismatch

**Issue**: MIME type doesn't match extension

**Solution**: Validate both and trust MIME type:

```typescript
const mimeToExt: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf'
};

const expectedExt = mimeToExt[input.file_type];
const actualExt = path.extname(input.file_name);

if (expectedExt !== actualExt) {
  ctx.logger.warn(`Extension mismatch: expected ${expectedExt}, got ${actualExt}`);
}
```

## Next Steps

- [Tools Guide](./04-tools-guide.md)
- [Widget SDK Reference](./18-widget-sdk-reference.md)
- [Best Practices](./17-best-practices.md)

