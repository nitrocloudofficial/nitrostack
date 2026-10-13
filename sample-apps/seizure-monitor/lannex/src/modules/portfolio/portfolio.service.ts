import { Injectable } from '@nitrostack/core';
import { PrismaService } from '../database/prisma.service.js';

export interface Asset {
  ticker: string;
  name: string;
  type: 'stock' | 'mutual_fund' | 'crypto' | 'gold';
  shares: number;
  avgPrice: number;
  currentPrice: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  dailyChange: number;
  dailyChangePct: number;
  totalReturn: number;
  totalReturnPct: number;
  assets: Asset[];
}

@Injectable({ deps: [PrismaService] })
export class PortfolioService {
  constructor(private readonly prismaService?: PrismaService) {}

  async getPortfolio(): Promise<PortfolioSummary> {
    if (!this.prismaService?.client) {
      return {
        totalValue: 0,
        totalInvested: 0,
        dailyChange: 0,
        dailyChangePct: 0,
        totalReturn: 0,
        totalReturnPct: 0,
        assets: []
      };
    }

    let dbAssets: any[] = [];
    try {
      dbAssets = await this.prismaService.client.asset.findMany();
    } catch (err) {
      dbAssets = [];
    }

    const assets: Asset[] = dbAssets.map((a: any) => ({
      ticker: a.ticker,
      name: a.name,
      type: a.type as 'stock' | 'mutual_fund' | 'crypto' | 'gold',
      shares: a.shares,
      avgPrice: a.avgPrice,
      currentPrice: a.currentPrice
    }));

    let totalValue = 0;
    let totalInvested = 0;

    // Simulate some daily fluctuation for realism
    const dailyChange = 1240.50;

    for (const asset of assets) {
      totalValue += asset.shares * asset.currentPrice;
      totalInvested += asset.shares * asset.avgPrice;
    }

    return {
      totalValue,
      totalInvested,
      dailyChange,
      dailyChangePct: totalValue > 0 ? (dailyChange / totalValue) * 100 : 0,
      totalReturn: totalValue - totalInvested,
      totalReturnPct: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      assets
    };
  }
}
