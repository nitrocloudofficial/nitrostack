import { AIService } from './AIService.js';
import { DatasetService, ClaimMetadata } from './DatasetService.js';
import { FraudDecision } from '../schemas/fraud.js';

export class ImageVerificationService {
  constructor(
    private aiService: AIService,
    private datasetService: DatasetService
  ) {}

  public async verifyClaimImage(claim: ClaimMetadata): Promise<FraudDecision> {
    // This helper delegates to DatasetService to get base64 image data safely
        let imagePayload: { data: string; mimeType: string } | undefined;
    try {
      imagePayload = await this.datasetService.getClaimImageBase64(claim.imageUrl);
    } catch (e) {
      // Ignore if image is missing
    }

    const claimsList = await this.datasetService.discoverClaims();
    const history: any[] = []; // In a real flow, we retrieve this, but keeping it simple for backward compatibility.

    return this.aiService.analyzeFraudWithRetries({
      claim,
      image: imagePayload,
      history
    });
  }
}
