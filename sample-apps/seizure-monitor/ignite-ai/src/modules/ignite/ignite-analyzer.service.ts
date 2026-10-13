import { Injectable } from '@nitrostack/core';
import { GoogleGenAI } from '@google/genai';

interface AnalysisResult {
  opportunity_score: number;
  uniqueness_score: number;
  problem_validation: string;
  market_potential: string;
  risks: string[];
  recommendations: string[];
}

@Injectable()
export class IgniteAnalyzerService {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyzeStartupIdea(
    startupIdea: string,
    industry: string,
    targetAudience: string
  ): Promise<AnalysisResult> {
    const prompt = `You are an expert venture analyst and startup advisor. Analyze the following startup idea and provide detailed venture intelligence.

**Startup Idea:** ${startupIdea}
**Industry:** ${industry}
**Target Audience:** ${targetAudience}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown, no extra text):

{
  "opportunity_score": <number 1-10, based on market size, timing, and founder fit>,
  "uniqueness_score": <number 1-10, based on differentiation and novelty>,
  "problem_validation": <string, evidence-based assessment of whether the problem is real and significant>,
  "market_potential": <string, specific market size estimate and growth trajectory for THIS idea>,
  "risks": [<string>, <string>, <string>, <string>, <string>],
  "recommendations": [<string>, <string>, <string>, <string>, <string>, <string>]
}

Guidelines:
- Scores should reflect the SPECIFIC idea, industry, and audience provided - not generic startup wisdom
- problem_validation should cite specific evidence (e.g., "Strong - healthcare providers spend $X on Y, creating clear ROI")
- market_potential should include concrete numbers and growth rates relevant to THIS specific idea
- risks should be tailored to the specific business model, industry, and market dynamics
- recommendations should be actionable next steps specific to validating and scaling THIS idea
- Be critical but fair - some ideas are genuinely strong, others have fundamental challenges`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      // Extract the text content from the response
      const responseText = response.text || '';

      // Parse the JSON response
      const analysis = JSON.parse(responseText) as AnalysisResult;

      // Validate the response structure
      this.validateAnalysisResult(analysis);

      return analysis;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse response as JSON: ${error.message}`);
      }
      throw error;
    }
  }

  private validateAnalysisResult(analysis: any): void {
    const requiredFields = [
      'opportunity_score',
      'uniqueness_score',
      'problem_validation',
      'market_potential',
      'risks',
      'recommendations'
    ];

    for (const field of requiredFields) {
      if (!(field in analysis)) {
        throw new Error(`Missing required field in analysis: ${field}`);
      }
    }

    if (typeof analysis.opportunity_score !== 'number' || analysis.opportunity_score < 1 || analysis.opportunity_score > 10) {
      throw new Error('opportunity_score must be a number between 1 and 10');
    }

    if (typeof analysis.uniqueness_score !== 'number' || analysis.uniqueness_score < 1 || analysis.uniqueness_score > 10) {
      throw new Error('uniqueness_score must be a number between 1 and 10');
    }

    if (typeof analysis.problem_validation !== 'string') {
      throw new Error('problem_validation must be a string');
    }

    if (typeof analysis.market_potential !== 'string') {
      throw new Error('market_potential must be a string');
    }

    if (!Array.isArray(analysis.risks) || analysis.risks.length === 0) {
      throw new Error('risks must be a non-empty array');
    }

    if (!Array.isArray(analysis.recommendations) || analysis.recommendations.length === 0) {
      throw new Error('recommendations must be a non-empty array');
    }
  }
}