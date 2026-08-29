import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class AgentsResources {
  @Resource({
    uri: 'aeios://agents/catalog',
    name: 'Agent Catalog',
    description: 'Complete catalog of available AEIOS-X specialist AI agents and their capabilities',
    mimeType: 'application/json',
  })
  async getCatalog(uri: string, ctx: ExecutionContext) {
    const catalog = {
      system: 'AEIOS-X Dynamic Agent Factory',
      totalAgentTypes: 11,
      agents: [
        { role: 'Enterprise Assistant', intents: ['GENERAL'], capabilities: ['General analysis', 'Q&A', 'Summarization'] },
        { role: 'Math Agent', intents: ['MATH'], capabilities: ['Calculations', 'Equations', 'Statistical analysis'] },
        { role: 'Coding Agent', intents: ['CODING'], capabilities: ['Code review', 'Implementation', 'Debugging'] },
        { role: 'Research Agent', intents: ['RESEARCH'], capabilities: ['Investigation', 'Comparison', 'Literature review'] },
        { role: 'Planning Agent', intents: ['PLANNING'], capabilities: ['Roadmaps', 'Timelines', 'Resource allocation'] },
        { role: 'Business Agent', intents: ['BUSINESS'], capabilities: ['Market analysis', 'ROI', 'Growth strategy'] },
        { role: 'Security Agent', intents: ['SECURITY'], capabilities: ['Threat analysis', 'Vulnerability assessment', 'Compliance'] },
        { role: 'SQL Agent', intents: ['SQL'], capabilities: ['Query optimization', 'Schema design', 'Data modeling'] },
        { role: 'Data Science Agent', intents: ['DATA_SCIENCE'], capabilities: ['ML models', 'Predictions', 'Data analysis'] },
        { role: 'DevOps Agent', intents: ['DEVOPS'], capabilities: ['CI/CD', 'Containerization', 'Cloud deployment'] },
        { role: 'MCP Agent', intents: ['MCP'], capabilities: ['MCP integration', 'Tool servers', 'Protocol design'] },
      ],
    };
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(catalog, null, 2) }],
    };
  }
}
