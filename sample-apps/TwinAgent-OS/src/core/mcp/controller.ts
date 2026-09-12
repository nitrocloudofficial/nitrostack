import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { mcpRegistry } from '../../mcp/registry/index.js';
import { mcpHandlers } from '../../mcp/handlers/index.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class MCPController {
  async getCapabilities(request: FastifyRequest, reply: FastifyReply) {
    const tools = mcpRegistry.getTools();
    const resources = mcpRegistry.getResources();
    const prompts = mcpRegistry.getPrompts();

    return reply.send(
      successResponse({
        mcpVersion: '1.0.0',
        capabilities: { tools: true, resources: true, prompts: true },
        tools,
        resources,
        prompts,
      })
    );
  }

  async executeTool(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const schema = z.object({
      name: z.string(),
      arguments: z.record(z.unknown()).default({}),
    });

    const { name, arguments: toolArgs } = schema.parse(request.body);
    const argsWithOrg = { organizationId: userPayload.organizationId, userId: userPayload.userId, ...toolArgs };

    let result: unknown;
    switch (name) {
      case 'predictProjectRisk':
        result = await mcpHandlers.predictProjectRisk(argsWithOrg);
        break;
      case 'predictBurnout':
        result = await mcpHandlers.predictBurnout(argsWithOrg);
        break;
      case 'updateTask':
        result = await mcpHandlers.updateTask(argsWithOrg);
        break;
      case 'searchKnowledge':
        result = await mcpHandlers.searchKnowledge(argsWithOrg);
        break;
      case 'organizationHealth':
        result = await mcpHandlers.organizationHealth(argsWithOrg);
        break;
      case 'summarizeProject':
        result = await mcpHandlers.summarizeProject(argsWithOrg);
        break;
      case 'recommendAssignee':
        result = await mcpHandlers.recommendAssignee(argsWithOrg);
        break;
      case 'findExpert':
        result = await mcpHandlers.findExpert(argsWithOrg);
        break;
      case 'runWorkflow':
        result = await mcpHandlers.runWorkflow(argsWithOrg);
        break;
      case 'approveAction':
        result = await mcpHandlers.approveAction(argsWithOrg);
        break;
      case 'syncConnector':
        result = await mcpHandlers.syncConnector(argsWithOrg);
        break;
      case 'calculateDigitalTwin':
        result = await mcpHandlers.calculateDigitalTwin(argsWithOrg);
        break;
      case 'getGraph':
        result = await mcpHandlers.getGraph(argsWithOrg);
        break;
      case 'globalSearch':
        result = await mcpHandlers.globalSearch(argsWithOrg);
        break;
      case 'getAuditLogs':
        result = await mcpHandlers.getAuditLogs(argsWithOrg);
        break;
      default:
        return reply.status(400).send({ success: false, error: `Unknown tool requested: ${name}` });
    }

    return reply.send(
      successResponse({
        tool: name,
        result,
      })
    );
  }
}

export const mcpController = new MCPController();
