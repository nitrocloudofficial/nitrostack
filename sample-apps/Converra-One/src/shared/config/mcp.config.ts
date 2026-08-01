import { env } from './env.config.js';

export const mcpConfig = {
  serverName: env.NITROSTACK.SERVER_NAME,
  version: '1.0.0',
  description: 'Converra One Agentic Communication Platform MCP Server',
  transports: env.NODE_ENV === 'production' ? ['stdio', 'sse'] : ['stdio']
};
