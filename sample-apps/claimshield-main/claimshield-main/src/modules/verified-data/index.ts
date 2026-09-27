import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import regulations from '../../data/regulations.js';
import repairCosts from '../../data/repair-costs.js';

@Injectable()
export class VerifiedDataTools {
  @Tool({
    name: 'query_irda_regulations',
    description: 'Query the verified IRDA and legal regulations database.',
    inputSchema: z.object({
      searchTopic: z.enum(['LATE_FILING', 'MISSING_FIR', 'LAPSED_POLICY', 'MISSING_SURVEYOR', 'MISSING_DRIVING_LICENCE', 'MISSING_PRE_AUTH'])
    }) as any
  })
  async queryRegulations(input: { searchTopic: string }) {
    const reg = (regulations as any)[input.searchTopic];
    if (!reg) return { error: "No verified regulation found for this topic." };
    return {
      verifiedData: true,
      title: reg.title,
      regulation: reg.regulation,
      description: reg.description
    };
  }

  @Tool({
    name: 'query_standard_repair_costs',
    description: 'Query verified standard repair costs for common vehicles or procedures.',
    inputSchema: z.object({
      category: z.enum(['motor', 'health']),
      itemType: z.string().describe("e.g. 'honda_city' or 'minor_injury_consultation'")
    }) as any
  })
  async queryRepairCosts(input: { category: string, itemType: string }) {
    const categoryData = (repairCosts as any)[input.category];
    if (!categoryData) return { error: "Invalid category" };
    
    const costData = categoryData[input.itemType];
    if (!costData) return { error: "No verified cost data for this item type.", availableKeys: Object.keys(categoryData) };

    return {
      verifiedData: true,
      currency: "INR",
      costs: costData
    };
  }
}

@Module({
  name: 'VerifiedDataModule',
  controllers: [VerifiedDataTools]
})
export class VerifiedDataModule {}
