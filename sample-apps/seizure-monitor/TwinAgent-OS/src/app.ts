import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { swaggerConfig } from './config/swagger.js';
import { AppError } from './shared/errors/AppError.js';
import { errorResponse, successResponse } from './shared/utils/response.js';
import { correlationMiddleware } from './shared/middleware/correlationMiddleware.js';

import { authRoutes } from './core/auth/routes.js';
import { userRoutes } from './core/users/routes.js';
import { organizationRoutes } from './core/organizations/routes.js';
import { projectRoutes } from './core/projects/routes.js';
import { taskRoutes } from './core/tasks/routes.js';
import { digitalTwinRoutes } from './core/digitalTwin/routes.js';
import { memoryRoutes } from './core/memory/routes.js';
import { graphRoutes } from './core/graph/routes.js';
import { predictionRoutes } from './core/prediction/routes.js';
import { aiRoutes } from './core/ai/routes.js';
import { mcpRoutes } from './core/mcp/routes.js';
import { workflowRoutes } from './core/workflows/routes.js';
import { approvalRoutes } from './core/approval/routes.js';
import { integrationRoutes } from './core/integrations/routes.js';
import { notificationRoutes } from './core/notifications/routes.js';
import { auditRoutes } from './core/audit/routes.js';
import { analyticsRoutes } from './core/analytics/routes.js';
import { searchRoutes } from './core/search/routes.js';
import { schedulerRoutes } from './core/scheduler/routes.js';
import { websocketRoutes } from './core/websocket/routes.js';

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  // Global Correlation ID Middleware
  app.addHook('onRequest', correlationMiddleware);

  // Security & Infrastructure Plugins
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, { origin: env.CORS_ORIGIN });
  app.register(rateLimit, { max: 500, timeWindow: '1 minute' });
  app.register(jwt, { secret: env.JWT_SECRET });
  app.register(websocket);

  // OpenAPI / Swagger
  app.register(swagger, swaggerConfig);
  app.register(swaggerUi, { routePrefix: '/documentation' });

  // System Health & Metrics
  app.get('/health', async () => successResponse({ status: 'UP', timestamp: new Date().toISOString() }));
  app.get('/metrics', async () =>
    successResponse({
      uptimeSeconds: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    })
  );

  // WebSocket Route
  app.register(websocketRoutes);

  // Modular Domain API Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
  app.register(organizationRoutes, { prefix: '/api/v1/organizations' });
  app.register(projectRoutes, { prefix: '/api/v1/projects' });
  app.register(taskRoutes, { prefix: '/api/v1/tasks' });
  app.register(digitalTwinRoutes, { prefix: '/api/v1/digital-twin' });
  app.register(memoryRoutes, { prefix: '/api/v1/memory' });
  app.register(graphRoutes, { prefix: '/api/v1/graph' });
  app.register(predictionRoutes, { prefix: '/api/v1/predictions' });
  app.register(aiRoutes, { prefix: '/api/v1/ai' });
  app.register(mcpRoutes, { prefix: '/api/v1/mcp' });
  app.register(workflowRoutes, { prefix: '/api/v1/workflows' });
  app.register(approvalRoutes, { prefix: '/api/v1/approvals' });
  app.register(integrationRoutes, { prefix: '/api/v1/integrations' });
  app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  app.register(auditRoutes, { prefix: '/api/v1/audit' });
  app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  app.register(searchRoutes, { prefix: '/api/v1/search' });
  app.register(schedulerRoutes, { prefix: '/api/v1/scheduler' });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(errorResponse(`Validation Error: ${error.errors.map((e) => e.message).join(', ')}`));
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(errorResponse(error.message));
    }
    app.log.error(error);
    return reply.status(500).send(errorResponse('Internal Server Error'));
  });

  return app;
}
