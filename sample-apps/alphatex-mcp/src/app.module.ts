import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { InvoiceModule } from './modules/invoice/invoice.module.js';

/**
 * Root Application Module
 * 
 * AlphaTex Invoicer MCP Server.
 * Registers core business logic, tax calculation engine, invoice tools and UI widgets.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'alphatex-invoicer',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'alphatex',
  description: 'AlphaTex Invoicer MCP Server Root Module',
  imports: [
    ConfigModule.forRoot(),
    InvoiceModule
  ],
})
export class AppModule { }
