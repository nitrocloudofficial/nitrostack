export type IntentType =
  | 'GENERAL'
  | 'MATH'
  | 'CODING'
  | 'RESEARCH'
  | 'PLANNING'
  | 'BUSINESS'
  | 'SECURITY'
  | 'SQL'
  | 'DATA_SCIENCE'
  | 'DEVOPS'
  | 'MCP';

interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  agents: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    type: 'MATH',
    patterns: [/calculat/i, /math/i, /equation/i, /formula/i, /solve/i, /\d+\s*[\+\-\*\/]\s*\d+/],
    agents: ['Math Agent'],
  },
  {
    type: 'CODING',
    patterns: [/code/i, /program/i, /function/i, /class/i, /debug/i, /implement/i, /typescript/i, /python/i, /javascript/i, /api/i],
    agents: ['Coding Agent'],
  },
  {
    type: 'RESEARCH',
    patterns: [/research/i, /study/i, /analyze/i, /investigate/i, /explore/i, /compare/i, /review/i],
    agents: ['Research Agent'],
  },
  {
    type: 'PLANNING',
    patterns: [/plan/i, /strategy/i, /roadmap/i, /timeline/i, /milestone/i, /project/i, /schedule/i],
    agents: ['Planning Agent'],
  },
  {
    type: 'BUSINESS',
    patterns: [/business/i, /revenue/i, /market/i, /customer/i, /profit/i, /growth/i, /roi/i],
    agents: ['Business Agent'],
  },
  {
    type: 'SECURITY',
    patterns: [/security/i, /vulnerab/i, /threat/i, /attack/i, /encrypt/i, /auth/i, /firewall/i, /compliance/i],
    agents: ['Security Agent'],
  },
  {
    type: 'SQL',
    patterns: [/sql/i, /database/i, /query/i, /table/i, /select/i, /insert/i, /join/i],
    agents: ['SQL Agent'],
  },
  {
    type: 'DATA_SCIENCE',
    patterns: [/data science/i, /machine learning/i, /model/i, /dataset/i, /prediction/i, /neural/i, /training/i],
    agents: ['Data Science Agent'],
  },
  {
    type: 'DEVOPS',
    patterns: [/deploy/i, /docker/i, /kubernetes/i, /ci\/cd/i, /pipeline/i, /infra/i, /cloud/i, /aws/i, /azure/i],
    agents: ['DevOps Agent'],
  },
  {
    type: 'MCP',
    patterns: [/mcp/i, /model context/i, /tool server/i, /resource server/i],
    agents: ['MCP Agent'],
  },
];

export interface IntentResult {
  intents: IntentType[];
  agents: string[];
  confidence: number;
}

export class IntentService {
  detect(prompt: string): IntentResult {
    const matched: IntentType[] = [];
    const agents = new Set<string>();

    for (const pattern of INTENT_PATTERNS) {
      if (pattern.patterns.some((p) => p.test(prompt))) {
        matched.push(pattern.type);
        pattern.agents.forEach((a) => agents.add(a));
      }
    }

    if (matched.length === 0) {
      matched.push('GENERAL');
      agents.add('Enterprise Assistant');
    }

    return {
      intents: matched,
      agents: Array.from(agents).sort(),
      confidence: Math.min(1.0, 0.5 + matched.length * 0.15),
    };
  }
}
