export async function transcribeVoice(audioBase64: string, language?: string): Promise<{
  transcript: string;
  detected_language: string;
}> {
  // Use Azure Speech or Sarvam AI for multilingual transcription
  // For hackathon MVP, return a simulated transcript
  if (process.env.AZURE_SPEECH_KEY) {
    try {
      const region = process.env.AZURE_SPEECH_REGION || 'southeastasia';
      const response = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language || 'auto'}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
            'Content-Type': 'audio/wav',
          },
          body: Buffer.from(audioBase64, 'base64'),
        }
      );
      const result = await response.json() as { DisplayText?: string };
      return {
        transcript: result.DisplayText || '',
        detected_language: language || 'en-IN',
      };
    } catch {
      // Fall through to mock
    }
  }

  return {
    transcript: 'Simulated transcript — configure Azure Speech or Sarvam AI for production',
    detected_language: language || 'en-IN',
  };
}

export function extractListingInfo(transcript: string): {
  material_description: string;
  quantity_kg?: number;
  price_per_kg?: number;
  location?: string;
} {
  const result: ReturnType<typeof extractListingInfo> = {
    material_description: transcript,
  };

  const kgMatch = transcript.match(/(\d+)\s*(?:kg|kilo|kilograms?)/i);
  if (kgMatch) result.quantity_kg = parseInt(kgMatch[1]);

  const priceMatch = transcript.match(/(?:Rs|INR|₹)\s*(\d+)\s*(?:per\s*kg|\/kg)/i);
  if (priceMatch) result.price_per_kg = parseInt(priceMatch[1]);

  return result;
}
