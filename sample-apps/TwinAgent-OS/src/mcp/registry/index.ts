import { mcpToolDefinitions } from '../tools/index.js';
import { mcpResourceDefinitions } from '../resources/index.js';
import { mcpPromptDefinitions } from '../prompts/index.js';

export class MCPRegistry {
  getTools() {
    return mcpToolDefinitions;
  }

  getResources() {
    return mcpResourceDefinitions;
  }

  getPrompts() {
    return mcpPromptDefinitions;
  }
}

export const mcpRegistry = new MCPRegistry();
