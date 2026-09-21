import { ThreatAnalyzer } from './threat.analyzer.js';

export class ThreatMatrixService {
  private services = new ThreatAnalyzer();

  async analyzeUrl(url: string) { return this.services.analyzeUrl(url); }
  async analyzePdf(filePath: string) { return this.services.analyzePdf(filePath); }
  async analyzeEmail(text: string) { return this.services.analyzeEmail(text); }
  async analyzeQr(qrData: string) { return this.services.analyzeQr(qrData); }
  async analyzeImageText(imageInput: string) { return this.services.analyzeImageText(imageInput); }

  async correlateThreats(payload: any) {
    if (payload.url) return this.services.analyzeUrl(payload.url);
    if (payload.filePath) return this.services.analyzePdf(payload.filePath);
    if (payload.qrData) return this.services.analyzeQr(payload.qrData);
    if (payload.imageInput || payload.inputType === 'image') return this.services.analyzeImageText(payload.imageInput || payload.rawText || '');
    return this.services.analyzeEmail(payload.rawText || '');
  }
}
