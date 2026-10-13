import { Module } from '@nitrostack/core';
import { PortfolioTools } from './portfolio.tools.js';

@Module({
  name: 'portfolio',
  controllers: [PortfolioTools],
})
export class PortfolioModule {}
