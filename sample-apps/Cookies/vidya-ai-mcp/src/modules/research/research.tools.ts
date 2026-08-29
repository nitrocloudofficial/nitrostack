import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseService } from '../../services/supabase.service.js';

// Initialize Gemini client (gracefully handle missing key)
let genAI: any = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  // Gemini initialization failed, will use mock data
}

// Mock paper data for demonstration
const mockPapers = [
  {
    id: 'paper_001',
    title: 'Deep Learning Applications in Medical Imaging',
    authors: ['Smith, J.', 'Johnson, M.', 'Williams, R.'],
    abstract: 'This paper explores the application of deep learning techniques to medical imaging, including CT scans, MRI, and X-rays. We demonstrate state-of-the-art results in disease detection and classification.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop'
  },
  {
    id: 'paper_002',
    title: 'Machine Learning for Predictive Healthcare Analytics',
    authors: ['Brown, A.', 'Davis, K.', 'Miller, T.'],
    abstract: 'We present a comprehensive framework for using machine learning to predict patient outcomes and optimize treatment plans. Our model achieves 94% accuracy on historical data.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop'
  },
  {
    id: 'paper_003',
    title: 'Natural Language Processing in Clinical Documentation',
    authors: ['Garcia, L.', 'Martinez, S.', 'Lopez, C.'],
    abstract: 'This study examines NLP techniques for extracting structured information from unstructured clinical notes, improving data quality and enabling better analytics.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160675-112ba8d25d1d?w=400&h=300&fit=crop'
  },
  {
    id: 'paper_004',
    title: 'Federated Learning for Privacy-Preserving Healthcare AI',
    authors: ['Chen, W.', 'Wang, X.', 'Liu, Y.'],
    abstract: 'We propose a federated learning approach that enables collaborative model training across multiple healthcare institutions while preserving patient privacy.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop'
  },
  {
    id: 'paper_005',
    title: 'Explainable AI for Clinical Decision Support',
    authors: ['Patel, R.', 'Sharma, V.', 'Gupta, N.'],
    abstract: 'This paper addresses the interpretability challenge in AI-driven clinical decision support systems, proposing methods to explain model predictions to healthcare professionals.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop'
  }
];

export class ResearchTools {
  @Tool({
    name: 'search_papers',
    description: 'Search for academic papers on a given topic. Returns a list of papers with titles, authors, and abstracts.',
    inputSchema: z.object({
      topic: z.string().describe('The research topic to search for'),
      count: z.number().int().min(1).max(20).describe('Number of papers to return')
    }),
    examples: {
      request: {
        topic: 'machine learning in healthcare',
        count: 5
      },
      response: {
        papers: [
          {
            id: 'paper_001',
            title: 'Deep Learning Applications in Medical Imaging',
            authors: ['Smith, J.', 'Johnson, M.'],
            abstract: 'This paper explores...',
            imageUrl: 'https://images.unsplash.com/...'
          }
        ]
      }
    }
  })
  @Widget('research-papers')
  async searchPapers(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Searching papers', { topic: input.topic, count: input.count });

    // Mock implementation - returns filtered papers based on topic
    const papers = mockPapers.slice(0, Math.min(input.count, mockPapers.length));

    return {
      topic: input.topic,
      count: papers.length,
      papers: papers.map(p => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        abstract: p.abstract,
        imageUrl: p.imageUrl
      }))
    };
  }

  @Tool({
    name: 'summarize_paper',
    description: 'Summarize a paper using Gemini AI. Extracts key findings and generates a concise summary.',
    inputSchema: z.object({
      paperId: z.string().describe('The ID of the paper to summarize'),
      abstract: z.string().describe('The abstract of the paper to summarize')
    }),
    examples: {
      request: {
        paperId: 'paper_001',
        abstract: 'This paper explores the application of deep learning...'
      },
      response: {
        paperId: 'paper_001',
        summary: 'The paper demonstrates how deep learning can be applied to medical imaging...',
        keyFindings: ['Finding 1', 'Finding 2']
      }
    }
  })
  @Widget('paper-summary')
  async summarizePaper(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Summarizing paper', { paperId: input.paperId });

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Summarize the following academic abstract in 2-3 sentences and extract 3 key findings as bullet points:

Abstract: ${input.abstract}

Format your response as JSON with fields "summary" (string) and "keyFindings" (array of strings).`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      let parsed;
      try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: responseText, keyFindings: [] };
      } catch {
        parsed = { summary: responseText, keyFindings: [] };
      }

      return {
        paperId: input.paperId,
        summary: parsed.summary || responseText,
        keyFindings: parsed.keyFindings || []
      };
    } catch (error) {
      ctx.logger.error('Error summarizing paper', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'generate_citation',
    description: 'Generate a formatted citation for a paper in the specified style (APA or MLA).',
    inputSchema: z.object({
      paper: z.object({
        title: z.string(),
        authors: z.array(z.string()),
        id: z.string()
      }).describe('The paper object with title, authors, and id'),
      style: z.enum(['APA', 'MLA']).describe('Citation style: APA or MLA')
    }),
    examples: {
      request: {
        paper: {
          title: 'Deep Learning Applications in Medical Imaging',
          authors: ['Smith, J.', 'Johnson, M.'],
          id: 'paper_001'
        },
        style: 'APA'
      },
      response: {
        citation: 'Smith, J., & Johnson, M. (2024). Deep learning applications in medical imaging. Journal of Medical AI.',
        style: 'APA'
      }
    }
  })
  async generateCitation(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating citation', { paperId: input.paper.id, style: input.style });

    const { paper, style } = input;
    const authorsStr = paper.authors.join(', ');
    const year = new Date().getFullYear();

    let citation: string;

    if (style === 'APA') {
      citation = `${authorsStr} (${year}). ${paper.title.toLowerCase()}. Journal of Medical AI.`;
    } else if (style === 'MLA') {
      citation = `${authorsStr}. "${paper.title}." Journal of Medical AI, ${year}.`;
    } else {
      throw new Error('Unsupported citation style');
    }

    return {
      citation,
      style,
      paperId: paper.id
    };
  }

  @Tool({
    name: 'build_literature_map',
    description: 'Build a structured comparison map of multiple papers for visualization.',
    inputSchema: z.object({
      papers: z.array(z.object({
        id: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        abstract: z.string()
      })).describe('Array of paper objects to map')
    }),
    examples: {
      request: {
        papers: [
          {
            id: 'paper_001',
            title: 'Paper 1',
            authors: ['Author 1'],
            abstract: 'Abstract 1'
          }
        ]
      },
      response: {
        nodes: [
          { id: 'paper_001', label: 'Paper 1', authors: 1 }
        ],
        edges: []
      }
    }
  })
  async buildLiteratureMap(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Building literature map', { paperCount: input.papers.length });

    const papers = input.papers;

    // Create nodes for each paper
    const nodes = papers.map((paper: any) => ({
      id: paper.id,
      label: paper.title,
      authors: paper.authors.length,
      abstract: paper.abstract.substring(0, 100) + '...'
    }));

    // Create edges based on author overlap (simplified)
    const edges: any[] = [];
    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const commonAuthors = papers[i].authors.filter((a: string) =>
          papers[j].authors.includes(a)
        ).length;

        if (commonAuthors > 0) {
          edges.push({
            source: papers[i].id,
            target: papers[j].id,
            weight: commonAuthors
          });
        }
      }
    }

    return {
      nodes,
      edges,
      paperCount: papers.length
    };
  }
}
