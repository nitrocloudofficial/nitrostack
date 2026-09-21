import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { Role } from '../../auth/auth.types.js';
import { AuthService } from '../../auth/auth.service.js';
import { getWaitTime as fetchWaitTime, updateWaitTime as storeWaitTime } from '../../fixtures/waitTimes.js';

/**
 * Hospital wait time management tools
 * Lab assistants update; patients/doctors read
 */

const updateWaitTimeSchema = z.object({
  hospitalId: z.string().describe('Hospital ID'),
  departmentId: z.string().describe('Department ID (e.g., "emergency", "cardiology", "lab")'),
  estimatedMinutes: z.number().describe('Estimated wait time in minutes'),
  sessionUserId: z.string().describe('Current user ID for session lookup'),
});

const getWaitTimeSchema = z.object({
  hospitalId: z.string().describe('Hospital ID'),
  departmentId: z.string().describe('Department ID'),
});

@Injectable({ deps: [AuthService] })
export class WaitTimesTools {
  constructor(private authService: AuthService) {}

  @Tool({
    name: 'updateWaitTime',
    description:
      'Update estimated wait time for a hospital department. Only lab assistants can call this.',
    inputSchema: updateWaitTimeSchema,
  })
  async updateWaitTime(input: z.infer<typeof updateWaitTimeSchema>, ctx: ExecutionContext) {
    const { hospitalId, departmentId, estimatedMinutes, sessionUserId } = input;

    // Get session context
    const session = this.authService.getSession(sessionUserId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found. Please authenticate first.',
      };
    }

    // Check role: only lab_assistant can update wait times
    if (session.role !== Role.LAB_ASSISTANT) {
      return {
        success: false,
        error: `Access denied: only lab assistants can update wait times. Your role: ${session.role}`,
      };
    }

    // Validate hospital ID matches session
    if (session.hospitalId !== hospitalId) {
      return {
        success: false,
        error: `Access denied: you can only update wait times for your assigned hospital (${session.hospitalId}).`,
      };
    }

    // Validate input
    if (estimatedMinutes < 0) {
      return {
        success: false,
        error: 'Estimated minutes must be non-negative.',
      };
    }

    // Update wait time
    const updated = storeWaitTime(hospitalId, departmentId, estimatedMinutes);

    ctx.logger.info(
      `Wait time updated: ${hospitalId}/${departmentId} = ${estimatedMinutes} minutes`
    );

    return {
      success: true,
      message: `Wait time updated for ${departmentId}: ${estimatedMinutes} minutes`,
      hospitalId,
      departmentId,
      estimatedMinutes,
      lastUpdated: updated.lastUpdated,
    };
  }

  @Tool({
    name: 'getWaitTime',
    description:
      'Get current estimated wait time for a hospital department. Callable by patients and doctors.',
    inputSchema: getWaitTimeSchema,
  })
  async getWaitTime(input: z.infer<typeof getWaitTimeSchema>, ctx: ExecutionContext) {
    const { hospitalId, departmentId } = input;

    // Fetch wait time
    const waitTime = fetchWaitTime(hospitalId, departmentId);

    if (!waitTime) {
      ctx.logger.info(`Wait time not found: ${hospitalId}/${departmentId}`);
      return {
        success: false,
        error: `No wait time data available for ${hospitalId}/${departmentId}`,
      };
    }

    ctx.logger.info(
      `Wait time retrieved: ${hospitalId}/${departmentId} = ${waitTime.estimatedMinutes} minutes`
    );

    return {
      success: true,
      hospitalId,
      departmentId,
      estimatedMinutes: waitTime.estimatedMinutes,
      lastUpdated: waitTime.lastUpdated,
      message: `Current wait time: ${waitTime.estimatedMinutes} minutes`,
    };
  }
}
