import { AttachmentNormalizerService } from '../src/services/AttachmentNormalizer.service.js';

async function testAttachmentNormalizer() {
  console.log('🧪 Testing AttachmentNormalizerService...');
  const normalizer = AttachmentNormalizerService.getInstance();
  const att = normalizer.normalizeAttachment({ filename: 'architecture.pdf', mimeType: 'application/pdf', size: 102400 });

  console.assert(att.category === 'document', 'PDF file should normalize to document category');
  console.assert(att.name === 'architecture.pdf', 'Attachment name should match input');
  console.log('✅ AttachmentNormalizerService test passed!');
}

testAttachmentNormalizer().catch(err => {
  console.error('❌ AttachmentNormalizerService test failed:', err);
  process.exit(1);
});
