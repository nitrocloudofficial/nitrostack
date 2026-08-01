/**
 * Sentinel Gateway — Review Tools
 * 
 * NitroStack MCP tools for managing the human review queue.
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Widget,
  ExecutionContext,
  Injectable,
  z,
} from '@nitrostack/core';
import { ReviewService } from './review.service.js';

@Controller('sentinel')
@Injectable({ deps: [ReviewService] })
export class ReviewTools {
  constructor(private readonly review: ReviewService) {}

  @Tool({
    name: 'get_review_queue',
    description: 'Get all items in the human review queue. Shows pending drift detections, injection flags, and policy violations that need human approval.',
    inputSchema: z.object({
      status: z.enum(['PENDING', 'APPROVED', 'DENIED']).optional().describe('Filter by status (default: all)'),
    }),
  })
  @Widget('review-queue')
  async getReviewQueue(
    input: { status?: string },
    ctx: ExecutionContext,
  ) {
    const items = input.status
      ? this.review.getAllItems().filter((i) => i.status === input.status)
      : this.review.getAllItems();

    ctx.logger.info(`Review queue: ${items.length} items`);

    return {
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        serverName: i.serverName,
        toolName: i.toolName,
        reason: i.reason,
        status: i.status,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
        resolvedBy: i.resolvedBy,
        details: i.details,
      })),
      pending: this.review.pendingCount,
      total: items.length,
    };
  }

  @Tool({
    name: 'approve_review',
    description: 'Approve a review item. For drift detections, this re-pins the tool fingerprint with the new description. For injection flags, this allows the call to proceed.',
    inputSchema: z.object({
      itemId: z.string().describe('The review item ID to approve'),
    }),
  })
  async approveReview(
    input: { itemId: string },
    ctx: ExecutionContext,
  ) {
    const item = this.review.approve(input.itemId);

    if (!item) {
      return { success: false, message: `Review item ${input.itemId} not found` };
    }

    ctx.logger.info(`Review approved: ${item.id} (${item.type})`);

    return {
      success: true,
      item: {
        id: item.id,
        type: item.type,
        status: item.status,
        resolvedAt: item.resolvedAt,
      },
      message: `✅ Review item approved. ${item.type === 'DRIFT' ? 'Fingerprint has been re-pinned.' : 'Action cleared.'}`,
    };
  }

  @Tool({
    name: 'deny_review',
    description: 'Deny a review item. The block remains active — the flagged tool/call stays blocked.',
    inputSchema: z.object({
      itemId: z.string().describe('The review item ID to deny'),
    }),
  })
  async denyReview(
    input: { itemId: string },
    ctx: ExecutionContext,
  ) {
    const item = this.review.deny(input.itemId);

    if (!item) {
      return { success: false, message: `Review item ${input.itemId} not found` };
    }

    ctx.logger.info(`Review denied: ${item.id} (${item.type})`);

    return {
      success: true,
      item: {
        id: item.id,
        type: item.type,
        status: item.status,
        resolvedAt: item.resolvedAt,
      },
      message: `🛑 Review item denied. Block remains active for ${item.serverName}/${item.toolName}.`,
    };
  }
}
