import 'dotenv/config';
import 'reflect-metadata';
import { McpApp, McpApplicationFactory, Module } from '@nitrostack/core';
import { ImportCycleDatasetTool } from './tools/importCycleDataset.js';
import { ExtractLabReportTool } from './tools/extractLabReport.js';
import { AnalyzePCOSTool } from './tools/analyzePCOS.js';
import { GenerateReportTool } from './tools/generateReport.js';
import { ClearTemporaryFilesTool } from './tools/clearTemporaryFiles.js';

const transportType = (process.env.MCP_TRANSPORT_TYPE ?? 'dual') as 'dual' | 'stdio' | 'http';
const httpOptions = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8000),
  basePath: process.env.MCP_BASE_PATH || undefined,
};

@Module({
  name: 'femmon',
  description: 'PCOS clinical decision-support prototype',
  controllers: [
    ImportCycleDatasetTool,
    ExtractLabReportTool,
    AnalyzePCOSTool,
    GenerateReportTool,
    ClearTemporaryFilesTool,
  ],
})
export class AppModule {}

@McpApp({
  module: AppModule,
  server: {
    name: 'femmon',
    version: '1.0.0',
  },
  transport: {
    type: transportType,
    http: httpOptions,
  },
})
export class FemmonApp {}
