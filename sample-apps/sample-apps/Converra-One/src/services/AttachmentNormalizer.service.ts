export interface UnifiedAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
  category: 'image' | 'document' | 'code_diff' | 'markdown' | 'other';
}

export class AttachmentNormalizerService {
  private static instance: AttachmentNormalizerService;

  constructor() {}

  public static getInstance(): AttachmentNormalizerService {
    if (!AttachmentNormalizerService.instance) {
      AttachmentNormalizerService.instance = new AttachmentNormalizerService();
    }
    return AttachmentNormalizerService.instance;
  }

  public normalizeAttachment(raw: { filename?: string; mimeType?: string; url?: string; size?: number }): UnifiedAttachment {
    const name = raw.filename || 'Attachment';
    const mimeType = raw.mimeType || 'application/octet-stream';
    let category: UnifiedAttachment['category'] = 'other';

    if (mimeType.startsWith('image/')) category = 'image';
    else if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) category = 'document';
    else if (name.endsWith('.patch') || name.endsWith('.diff')) category = 'code_diff';
    else if (name.endsWith('.md')) category = 'markdown';

    return {
      id: `att-${Math.random().toString(36).slice(2, 9)}`,
      name,
      mimeType,
      sizeBytes: raw.size,
      url: raw.url,
      category
    };
  }
}
