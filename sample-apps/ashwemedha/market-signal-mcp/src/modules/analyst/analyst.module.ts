import { Module } from '@nitrostack/core';
import { AnalystTools } from './analyst.tools.js';
import { SignalLogResources } from './signal-log.resource.js';

@Module({
  name: 'analyst',
  description:
    'Analyst Agent: real-time price/volume fetching (Alpha Vantage + CoinGecko), ' +
    'price reaction classification, signal strength scoring (0–100 explicit rules). ' +
    'Owns the signal_log Resource.',
  controllers: [AnalystTools, SignalLogResources],
})
export class AnalystModule {}
