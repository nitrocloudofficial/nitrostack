import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import scanRoutes from './routes/scan.routes.js';
import monitoringRoutes from './routes/monitoring.routes.js';
import websiteScanRoutes from './routes/websiteScan.routes.js';
import sandboxScanRoutes from './routes/sandboxScan.routes.js';
import historyRoutes from './routes/history.routes.js';
import { MonitoringWorker } from './workers/monitoring.worker.js';

// Import NitroStack core requirements
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Try to connect to database
    try {
      await connectDatabase();
    } catch (dbError) {
      console.error('⚠️  Database connection failed, but server will continue...');
    }

    // Force NitroStack to use HTTP transport so it runs the HTTP/SSE server
    process.env.MCP_TRANSPORT_TYPE = 'http';

    // Bootstrap the NitroStack MCP Server application
    console.log('🔄 Bootstrapping NitroStack MCP Server...');
    const server = await McpApplicationFactory.create(AppModule);

    // Start the NitroStack server (this will start the HTTP listener on the configured port)
    await server.start();

    // Retrieve the integrated Express app from the HTTP transport
    const httpTransport = server.getHttpTransport();
    if (!httpTransport) {
      throw new Error('Failed to retrieve HTTP transport from NitroStack Server');
    }
    const app = (httpTransport as any).getApp() as express.Express;

    // CORS configuration - normalize frontend URL to remove trailing slash
    const frontendUrl = config.frontendUrl.replace(/\/$/, '');

    // Configure standard Express middlewares on the same server instance
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        const isLocalhost = normalizedOrigin.startsWith('http://localhost:') || 
                            normalizedOrigin.startsWith('http://127.0.0.1:') ||
                            normalizedOrigin === 'http://tauri.localhost';
        if (normalizedOrigin === frontendUrl || isLocalhost) {
          callback(null, true);
        } else {
          console.log(`CORS blocked: ${origin} (normalized: ${normalizedOrigin}) !== ${frontendUrl}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Register all standard API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/scan', scanRoutes);
    app.use('/api/monitoring', monitoringRoutes);
    app.use('/api/website-scan', websiteScanRoutes);
    app.use('/api/sandbox', sandboxScanRoutes);
    app.use('/api/history', historyRoutes);

    // Health check
    app.get('/health', (req, res) => {
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: config.nodeEnv
      });
    });

    // Error handling
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
      });
    });

    const port = Number(config.port) || 5000;
    const isProduction = config.nodeEnv === 'production' || process.env.RENDER === 'true';
    const host = isProduction ? '0.0.0.0' : 'localhost';

    console.log(`🚀 Backend server (integrated NitroStack SDK) running on http://${host}:${port}`);
    console.log(`📱 Frontend URL: http://localhost:8080`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Start monitoring worker only if DB is connected
    if (mongoose.connection.readyState === 1) {
      MonitoringWorker.start();
    } else {
      console.log('⚠️  Monitoring worker not started (no database connection)');
    }

    // Graceful shutdown hooks integration
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      MonitoringWorker.stop();
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      MonitoringWorker.stop();
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
