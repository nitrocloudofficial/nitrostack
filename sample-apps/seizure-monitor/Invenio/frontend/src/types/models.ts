export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: Author[];
  year: number;
  journal: string;
}

export interface Author {
  id: string;
  name: string;
  affiliation: string;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  type: 'hypothesis' | 'evidence' | 'contradiction';
  confidence: number;
}

export interface AgentResponse {
  id: string;
  message: string;
  relatedNodes: string[];
}
