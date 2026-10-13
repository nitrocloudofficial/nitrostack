import { Injectable, ControllerDecorator as Controller, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { ContextService } from './context.service.js';
import { 
  ExtractContextSchema, 
  DetectMissingInformationSchema, 
  NormalizeRequestSchema 
} from './context.schema.js';
import { 
  ExtractContextArgs, 
  DetectMissingInformationArgs, 
  NormalizeRequestArgs 
} from './context.types.js';
import { ApiKeyGuard } from '../../core/auth/api-key.guard.js';

@Injectable({ deps: [ContextService, AIService] })
@Controller()
export class ContextTools {
  constructor(
    private readonly contextService: ContextService,
    private readonly aiService?: AIService
  ) {}

  @Tool({
    name: 'extractContext',
    description: 'Extracts structured decision context from a raw user request.',
    inputSchema: ExtractContextSchema
  })
  @UseGuards(ApiKeyGuard)
  public async extractContext(args?: ExtractContextArgs) {
    console.error('[ContextTool] Tool invoked');
    try {
      return await this.contextService.extractContext(args || { request: '' });
    } catch (error: any) {
      console.error('[ContextTool] Raw error caught in tool:');
      const ai = this.aiService || new AIService();
      return ai.parseGeminiError(error);
    }
  }

  @Tool({
    name: 'detectMissingInformation',
    description: 'Detects if critical information is missing from the provided context.',
    inputSchema: DetectMissingInformationSchema
  })
  @UseGuards(ApiKeyGuard)
  public async detectMissingInformation(args?: DetectMissingInformationArgs) {
    try {
      return this.contextService.detectMissingInformation(args || { objective: '', entities: [], constraints: [] });
    } catch (error: any) {
      const ai = this.aiService || new AIService();
      return ai.parseGeminiError(error);
    }
  }

  @Tool({
    name: 'normalizeRequest',
    description: 'Normalizes the raw request string to reduce noise.',
    inputSchema: NormalizeRequestSchema
  })
  @UseGuards(ApiKeyGuard)
  public async normalizeRequest(args?: NormalizeRequestArgs) {
    try {
      return this.contextService.normalizeRequest(args || { request: '' });
    } catch (error: any) {
      const ai = this.aiService || new AIService();
      return ai.parseGeminiError(error);
    }
  }
}
