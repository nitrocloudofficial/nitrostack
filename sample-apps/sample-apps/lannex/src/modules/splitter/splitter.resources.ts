import { ResourceDecorator as Resource, Injectable, ExecutionContext } from '@nitrostack/core';
import { SplitterService, SplitResult } from './splitter.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable({ deps: [SplitterService, PrismaService] })
export class SplitterResources {
  constructor(
    private readonly splitterService: SplitterService,
    private readonly prismaService?: PrismaService
  ) {}

  @Resource({
    uri: 'splitter://recent-splits',
    name: 'Recent Bill Splits',
    description: 'List of recent bill split results with participant shares from database',
    mimeType: 'application/json',
    examples: {
      response: {
        splits: [
          {
            merchant: 'Restaurant Name',
            shares: { 'Rahul': { total: 225 }, 'Sarah': { total: 150 } },
            totalBill: 500
          }
        ],
        count: 2
      }
    }
  })
  async getRecentSplits(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching recent bill splits from database');

    if (!this.prismaService?.client) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            splits: [],
            count: 0,
            message: 'Database connection not available'
          }, null, 2)
        }]
      };
    }

    const receipts = await this.prismaService.client.receipt.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    const splits = receipts.map((receipt: any) => {
      // Group items by person to calculate shares
      const personTotals: Record<string, number> = {};

      receipt.items.forEach((item: any) => {
        const person = item.person || 'shared';
        if (person === 'shared' || person.toLowerCase() === 'all') {
          // Split equally among all participants
          const participants = new Set<string>(receipt.items.map((i: any) => i.person).filter((p: any) => p && p !== 'shared' && p.toLowerCase() !== 'all'));
          const participantCount = participants.size || 1;
          participants.forEach((p: string) => {
            personTotals[p] = (personTotals[p] || 0) + (item.price / participantCount);
          });
        } else {
          personTotals[person] = (personTotals[person] || 0) + item.price;
        }
      });

      // Build shares object with detailed breakdown
      const shares: Record<string, any> = {};
      const subtotalSum = receipt.items.reduce((sum: number, item: any) => sum + item.price, 0);

      Object.entries(personTotals).forEach(([person, subtotal]) => {
        const ratio = subtotalSum > 0 ? subtotal / subtotalSum : 0;
        shares[person] = {
          subtotal: Math.round(subtotal * 100) / 100,
          taxShare: Math.round(ratio * receipt.tax * 100) / 100,
          tipShare: Math.round(ratio * receipt.tip * 100) / 100,
          total: Math.round((subtotal + ratio * receipt.tax + ratio * receipt.tip) * 100) / 100
        };
      });

      return {
        merchant: receipt.merchant,
        payerName: receipt.payerName,
        shares,
        totalSubtotal: Math.round(subtotalSum * 100) / 100,
        totalTax: receipt.tax,
        totalTip: receipt.tip,
        totalBill: receipt.total,
        createdAt: receipt.createdAt.toISOString()
      };
    });

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          splits,
          count: splits.length
        }, null, 2)
      }]
    };
  }
}
