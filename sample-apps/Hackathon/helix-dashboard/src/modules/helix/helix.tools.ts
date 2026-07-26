import { ToolDecorator as Tool, Widget, z, Injectable, ExecutionContext } from '@nitrostack/core';
import { LLMService } from '../../services/llm.service.js';
import { RAGService } from '../../services/rag.service.js';

@Injectable()
export class HelixTools {
  constructor(
    private readonly llmService: LLMService,
    private readonly ragService: RAGService
  ) {}

  @Tool({
    name: 'chat',
    description: 'Conversational interface with RAG context for HELIX Cognitive Platform',
    inputSchema: z.object({
      message: z.string().describe('User message or question'),
      department: z.string().optional().describe('Target enterprise department')
    })
  })
  @Widget('chatbot')
  async chat(
    input: { message: string; department?: string },
    ctx: ExecutionContext
  ) {
    const res = await this.ragService.askQuestion(input.message, input.department || 'Engineering');
    return {
      response: res.answer,
      confidence: res.confidence_score,
      sources: res.sources
    };
  }

  @Tool({
    name: 'ask_question',
    description: 'Answer enterprise questions grounded in 100% accuracy Hybrid RAG knowledge',
    inputSchema: z.object({
      question: z.string().describe('Enterprise query to answer'),
      department: z.string().optional().describe('Department context')
    })
  })
  @Widget('chatbot')
  async askQuestion(
    input: { question: string; department?: string },
    ctx: ExecutionContext
  ) {
    return this.ragService.askQuestion(input.question, input.department || 'Engineering');
  }

  @Tool({
    name: 'analyze_drift',
    description: 'Execute 4-Vector Cognitive Drift Diagnostic for enterprise departments',
    inputSchema: z.object({
      department: z.string().describe('Department to analyze'),
      signals: z.array(z.string()).describe('Operational signal logs')
    })
  })
  @Widget('helix')
  async analyzeDrift(
    input: { department: string; signals: string[] },
    ctx: ExecutionContext
  ) {
    return this.ragService.analyzeDrift(input.department, input.signals);
  }
}
