import { MemoryAgent } from '../modules/memory/MemoryAgent.js';

export const memoryResource = {
  uri: 'resource://memory/conversations',
  name: 'Conversation Memory Store',
  description: 'Cross-channel user commitments, promises, and contextual thread memory',
  read: async () => {
    const agent = new MemoryAgent();
    const result = await agent.execute();
    return result.data?.commitments || [];
  }
};
