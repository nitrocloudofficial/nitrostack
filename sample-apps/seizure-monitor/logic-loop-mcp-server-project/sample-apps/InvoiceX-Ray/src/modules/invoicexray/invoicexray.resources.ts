import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { DbDataProvider } from '../../data/dbDataProvider.js';

const data = new DbDataProvider();

export class InvoicexrayResources {
  @Resource({
    uri: 'trade-invoice-feed://{id}',
    name: 'Trade Invoice Feed',
    description: 'Dynamic database feed for a trade transaction details',
    mimeType: 'application/json'
  })
  async getInvoiceFeed(uri: string, ctx: ExecutionContext) {
    const invoiceId = uri.split('://')[1];
    const txn = await data.getTransactionById(invoiceId);
    if (!txn) throw new Error(`Invoice not found: ${invoiceId}`);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(txn, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'commodity-benchmark://{id}',
    name: 'Commodity Benchmarks',
    description: 'Historical commodity price statistical benchmarks',
    mimeType: 'application/json'
  })
  async getCommodityBenchmarks(uri: string, ctx: ExecutionContext) {
    const hsCode = uri.split('://')[1];
    const benchmark = await data.getBenchmarkByHsCode(hsCode);
    if (!benchmark) throw new Error(`Benchmark not found for HS: ${hsCode}`);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(benchmark, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'edpms-realization-status://{id}',
    name: 'EDPMS Realization Status',
    description: 'EDPMS records and deadline tracking for FEMA 2026 compliance',
    mimeType: 'application/json'
  })
  async getEdpmsRealization(uri: string, ctx: ExecutionContext) {
    const exporterId = uri.split('://')[1];
    const records = await data.getEdpmsRecordsByExporter(exporterId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(records, null, 2)
      }]
    };
  }
}
