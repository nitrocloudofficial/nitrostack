import { Module } from '@nitrostack/core';
import { PortfolioService } from './portfolio.service.js';
import { PortfolioTools } from './portfolio.tools.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'portfolio',
  imports: [DatabaseModule],
  providers: [PortfolioService],
  controllers: [PortfolioTools],
  exports: [PortfolioService]
})
export class PortfolioModule {}
