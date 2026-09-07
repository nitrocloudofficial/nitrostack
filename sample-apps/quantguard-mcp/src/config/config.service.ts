import { Injectable, ConfigService as NitroConfigService } from '@nitrostack/core';

/**
 * QuantGuard ConfigService — environment and API configuration
 */
@Injectable({ deps: [NitroConfigService] })
export class QuantGuardConfigService {
  constructor(private configService: NitroConfigService) {}

  /**
   * Market data API key (Yahoo Finance, Polygon.io, or AlphaVantage)
   */
  getMarketDataApiKey(): string {
    return this.configService.get('MARKET_DATA_API_KEY') || '';
  }

  /**
   * News API key (NewsAPI or Finnhub)
   */
  getNewsApiKey(): string {
    return this.configService.get('NEWS_API_KEY') || '';
  }

  /**
   * Binance WebSocket URL (optional, for live crypto data)
   */
  getBinanceWebSocketUrl(): string {
    return this.configService.get('BINANCE_WS_URL') || 'wss://stream.binance.com:9443/ws';
  }

  /**
   * Market data provider type (yahoo, polygon, alphavantage)
   */
  getMarketDataProvider(): string {
    return this.configService.get('MARKET_DATA_PROVIDER') || 'yahoo';
  }

  /**
   * Environment (development, production)
   */
  getEnvironment(): string {
    return this.configService.get('NODE_ENV') || 'development';
  }

  /**
   * Server port
   */
  getPort(): number {
    const port = this.configService.get('PORT');
    return port ? parseInt(port, 10) : 3000;
  }
}
