import { Injectable, ConfigService } from '@nitrostack/core';
import { GoogleGenAI } from '@google/genai';
import { IgniteAnalyzerService } from './ignite-analyzer.service.js';
import { ChatService } from './chat.service.js';

export interface AgentResponse {
  message: string;
  detectedIndustry?: string;
  detectedAudience?: string;
  toolInvoked?: boolean;
  analysisData?: any;
}

@Injectable({ deps: [ConfigService, IgniteAnalyzerService, ChatService] })
export class AgentOrchestratorService {
  private client: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    private analyzerService: IgniteAnalyzerService,
    private chatService: ChatService
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Process a user message and generate an agent response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<AgentResponse> {
    // Add user message to chat history
    this.chatService.addMessage(sessionId, 'user', userMessage);

    // Get conversation context
    const conversationContext = this.chatService.getConversationContext(sessionId);

    // Step 1: Analyze the message to extract startup idea, industry, and audience
    const extraction = await this.extractStartupContext(userMessage, conversationContext);

    let analysisData: any = null;
    let toolInvoked = false;

    // Step 2: If a startup idea is detected, invoke the analyzer tool
    if (extraction.startupIdea) {
      try {
        analysisData = await this.analyzerService.analyzeStartupIdea(
          extraction.startupIdea,
          extraction.industry || 'General',
          extraction.targetAudience || 'Not specified'
        );
        toolInvoked = true;
      } catch (error) {
        // If analysis fails, continue with conversational response
        // (e.g., API key not set, rate limited, etc.)
      }
    }

    // Step 3: Generate a natural conversational response
    const assistantResponse = await this.generateResponse(
      userMessage,
      conversationContext,
      extraction,
      analysisData
    );

    // Add assistant response to chat history
    this.chatService.addMessage(sessionId, 'assistant', assistantResponse, {
      detectedIndustry: extraction.industry ?? undefined,
      detectedAudience: extraction.targetAudience ?? undefined,
      toolInvoked: toolInvoked ? 'analyze-idea' : undefined
    });

    return {
      message: assistantResponse,
      detectedIndustry: extraction.industry ?? undefined,
      detectedAudience: extraction.targetAudience ?? undefined,
      toolInvoked,
      analysisData
    };
  }

  /**
   * Extract startup idea, industry, and target audience from user message
   */
  private async extractStartupContext(
    userMessage: string,
    conversationContext: string
  ): Promise<{
    startupIdea: string | null;
    industry: string | null;
    targetAudience: string | null;
  }> {
    const prompt = `You are an expert at understanding startup ideas. Analyze the following user message and extract:
1. The startup idea (if present)
2. The industry (infer if not explicitly stated)
3. The target audience (infer if not explicitly stated)

User message: "${userMessage}"

${conversationContext ? `\nConversation context:\n${conversationContext}` : ''}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "startupIdea": "<string or null if no idea is mentioned>",
  "industry": "<string or null if cannot be inferred>",
  "targetAudience": "<string or null if cannot be inferred>"
}

Guidelines:
- startupIdea should be a clear, concise description of the business concept
- industry should be specific (e.g., "HealthTech", "FinTech", "AgriTech", "GameDev", "Robotics", "AI/ML", "SaaS", "Consumer Apps", "Automotive", "Manufacturing", "Defence", "Retail")
- targetAudience should describe who would use/buy the product
- If the user is asking a follow-up question about a previously mentioned idea, extract that idea from context
- Be generous in inferring industry and audience from context clues`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 256,
        }
      });

      const responseText = response.text || '';
      const extraction = JSON.parse(responseText);
      return extraction;
    } catch (error) {
      // If extraction fails, return nulls
      return {
        startupIdea: null,
        industry: null,
        targetAudience: null
      };
    }
  }

  /**
   * Generate a natural conversational response
   */
  private async generateResponse(
    userMessage: string,
    conversationContext: string,
    extraction: {
      startupIdea: string | null;
      industry: string | null;
      targetAudience: string | null;
    },
    analysisData: any
  ): Promise<string> {
    let systemPrompt = `You are IGNITE AI, your AI Startup Co-Founder. You are an expert venture analyst, startup advisor, and business strategist.

Your role is to:
1. Listen to startup ideas from entrepreneurs
2. Provide thoughtful, actionable feedback
3. Identify opportunities and risks
4. Suggest next steps for validation and growth
5. Maintain a conversational, encouraging tone
6. Ask clarifying questions when needed
7. Build on previous context in the conversation

You have access to venture analysis tools that provide structured insights (opportunity scores, market analysis, risks, recommendations). Use these insights to inform your responses, but always synthesize them into natural, conversational language.

Never mention that you are using tools or that analysis was performed. Simply provide insights as if you naturally understand the market.

Be specific, data-driven, and actionable. Avoid generic startup advice.`;

    let userPrompt = userMessage;

    if (analysisData) {
      userPrompt += `

[Internal Analysis Data - synthesize this into your response naturally]:
- Opportunity Score: ${analysisData.opportunity_score}/10
- Uniqueness Score: ${analysisData.uniqueness_score}/10
- Problem Validation: ${analysisData.problem_validation}
- Market Potential: ${analysisData.market_potential}
- Key Risks: ${analysisData.risks.join(', ')}
- Recommendations: ${analysisData.recommendations.join(', ')}`;
    }

    if (extraction.startupIdea) {
      userPrompt += `

[Detected Startup Idea]: ${extraction.startupIdea}
[Detected Industry]: ${extraction.industry || 'Not specified'}
[Detected Target Audience]: ${extraction.targetAudience || 'Not specified'}`;
    }

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 1024,
        }
      });

      const responseText = response.text || '';
      return responseText;
    } catch (error) {
      return 'I encountered an error processing your request. Please try again.';
    }
  }
}