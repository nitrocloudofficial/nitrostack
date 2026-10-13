import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { SplitterModule } from './modules/splitter/splitter.module.js';
import { ActionsModule } from './modules/actions/actions.module.js';
import { PortfolioModule } from './modules/portfolio/portfolio.module.js';
import { DebtsModule } from './modules/debts/debts.module.js';
import { DatabaseModule } from './modules/database/database.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'lannex',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    ExpensesModule,
    DashboardModule,
    SplitterModule,
    ActionsModule,
    PortfolioModule,
    DebtsModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}

