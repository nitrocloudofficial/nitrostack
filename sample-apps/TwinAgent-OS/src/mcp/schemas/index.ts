import { z } from 'zod';

export const predictProjectRiskSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

export const predictBurnoutSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
});

export const updateTaskSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  userId: z.string().min(1, 'userId is required'),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  riskScore: z.number().min(0).max(100).optional(),
});

export const searchKnowledgeSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
  query: z.string().min(1, 'query is required'),
  category: z.string().optional(),
});

export const organizationHealthSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
});

export const summarizeProjectSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

export const recommendAssigneeSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
  requiredSkills: z.array(z.string()).optional(),
});

export const findExpertSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
  skillName: z.string().min(1, 'skillName is required'),
});

export const runWorkflowSchema = z.object({
  workflowId: z.string().min(1, 'workflowId is required'),
  requesterId: z.string().min(1, 'requesterId is required'),
  payload: z.record(z.unknown()).optional(),
});

export const approveActionSchema = z.object({
  approvalId: z.string().min(1, 'approvalId is required'),
  reviewerId: z.string().min(1, 'reviewerId is required'),
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
});

export const syncConnectorSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  mode: z.enum(['FULL', 'INCREMENTAL']).optional(),
});

export const calculateDigitalTwinSchema = z.object({
  targetType: z.enum(['USER', 'PROJECT']),
  targetId: z.string().min(1, 'targetId is required'),
});

export const getGraphSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
});

export const globalSearchSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
  query: z.string().min(1, 'query is required'),
});

export const getAuditLogsSchema = z.object({
  organizationId: z.string().min(1, 'organizationId is required'),
});
