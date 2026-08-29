import { Injectable } from '@nitrostack/core';

@Injectable()
export class ClassifierService {
  async classify(text: string): Promise<string> {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('employment agreement') || lowerText.includes('salary') || lowerText.includes('employee')) {
      return 'employment_contract';
    }
    if (lowerText.includes('non-disclosure') || lowerText.includes('confidentiality') || lowerText.includes('nda')) {
      return 'nda';
    }
    if (lowerText.includes('vendor') || lowerText.includes('services agreement') || lowerText.includes('contractor')) {
      return 'vendor_agreement';
    }
    return 'general_contract';
  }
}
