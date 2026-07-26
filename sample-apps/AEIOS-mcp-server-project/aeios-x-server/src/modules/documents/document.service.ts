import { GroqClient, type ChatMessage } from '../../llm/groq-client.js';
import { v4 as uuid } from 'uuid';

export interface DocumentAnalysis {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  entities: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  wordCount: number;
  readingTimeMinutes: number;
  language: string;
  categories: string[];
  timestamp: Date;
}

export interface DocumentComparison {
  similarity: number;
  commonKeywords: string[];
  differences: string[];
}

export class DocumentService {
  private llm = new GroqClient();
  private documents = new Map<string, DocumentAnalysis>();

  async analyze(text: string, title?: string): Promise<DocumentAnalysis> {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    const keywords = this.extractKeywords(text);
    const entities = this.extractEntities(text);
    const sentiment = this.analyzeSentiment(text);
    const categories = this.categorize(text);

    const summary = await this.summarize(text);

    const analysis: DocumentAnalysis = {
      id: uuid(),
      title: title || `Document ${this.documents.size + 1}`,
      summary,
      keywords,
      entities,
      sentiment,
      wordCount,
      readingTimeMinutes: readingTime,
      language: 'en',
      categories,
      timestamp: new Date(),
    };

    this.documents.set(analysis.id, analysis);
    return analysis;
  }

  async summarize(text: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Summarize the following text in 2-3 concise sentences. Focus on key points and actionable insights.' },
      { role: 'user', content: text.slice(0, 4000) },
    ];
    return this.llm.chat(messages, { maxTokens: 256 });
  }

  async extractInsights(text: string): Promise<Record<string, unknown>> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Analyze the text and return a JSON object with: "keyFindings" (array of strings), "risks" (array of strings), "recommendations" (array of strings), "actionItems" (array of strings).',
      },
      { role: 'user', content: text.slice(0, 4000) },
    ];
    return this.llm.jsonChat(messages, { maxTokens: 1024 });
  }

  extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or', 'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'also', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'he', 'him', 'his', 'she', 'her', 'i', 'me', 'my', 'you', 'your']);

    const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    const freq = new Map<string, number>();
    words.filter(w => w.length > 3 && !stopWords.has(w)).forEach(w => freq.set(w, (freq.get(w) || 0) + 1));

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  extractEntities(text: string): string[] {
    const patterns = [
      /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g,
      /\b[A-Z]{2,}\b/g,
      /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?\b/g,
      /\b\$\d+(?:,\d{3})*(?:\.\d+)?\b/g,
    ];

    const entities = new Set<string>();
    patterns.forEach(p => {
      const matches = text.match(p);
      if (matches) matches.forEach(m => entities.add(m.trim()));
    });

    return Array.from(entities).slice(0, 20);
  }

  analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const positive = ['good', 'great', 'excellent', 'success', 'improve', 'benefit', 'advantage', 'growth', 'opportunity', 'achieve', 'efficient', 'innovative', 'progress', 'optimal', 'strong'];
    const negative = ['bad', 'fail', 'risk', 'threat', 'decline', 'loss', 'problem', 'issue', 'concern', 'weakness', 'vulnerable', 'critical', 'danger', 'error', 'deficit'];

    const lower = text.toLowerCase();
    const posCount = positive.filter(w => lower.includes(w)).length;
    const negCount = negative.filter(w => lower.includes(w)).length;

    if (posCount > 0 && negCount > 0) return 'mixed';
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  categorize(text: string): string[] {
    const categories: string[] = [];
    const lower = text.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      technology: ['software', 'api', 'database', 'cloud', 'server', 'code', 'system', 'platform', 'application'],
      business: ['revenue', 'market', 'strategy', 'customer', 'growth', 'investment', 'profit', 'sales'],
      security: ['security', 'vulnerability', 'authentication', 'encryption', 'threat', 'compliance', 'audit'],
      operations: ['deploy', 'infrastructure', 'monitoring', 'performance', 'scaling', 'maintenance'],
      management: ['project', 'team', 'timeline', 'milestone', 'planning', 'resource', 'budget'],
      analytics: ['data', 'analytics', 'metrics', 'dashboard', 'report', 'insights', 'trends'],
    };

    Object.entries(categoryKeywords).forEach(([cat, keywords]) => {
      if (keywords.some(k => lower.includes(k))) categories.push(cat);
    });

    return categories.length > 0 ? categories : ['general'];
  }

  compare(text1: string, text2: string): DocumentComparison {
    const kw1 = new Set(this.extractKeywords(text1));
    const kw2 = new Set(this.extractKeywords(text2));
    const common = Array.from(kw1).filter(k => kw2.has(k));
    const only1 = Array.from(kw1).filter(k => !kw2.has(k));
    const only2 = Array.from(kw2).filter(k => !kw1.has(k));

    const similarity = common.length / Math.max(kw1.size, kw2.size, 1);

    return {
      similarity: Math.round(similarity * 100) / 100,
      commonKeywords: common,
      differences: [...only1.map(k => `Doc1: ${k}`), ...only2.map(k => `Doc2: ${k}`)],
    };
  }

  getDocument(id: string): DocumentAnalysis | undefined {
    return this.documents.get(id);
  }

  listDocuments(): DocumentAnalysis[] {
    return Array.from(this.documents.values());
  }
}
