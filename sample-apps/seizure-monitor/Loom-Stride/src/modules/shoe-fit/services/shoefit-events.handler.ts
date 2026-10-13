import { Injectable, OnEvent } from '@nitrostack/core';

/**
 * ShoeFit Event Handler
 *
 * Listens for measurement and database events for audit trail logging.
 */
@Injectable({ deps: [] })
export class ShoeFitEventHandler {
  @OnEvent('shoefit.measurement.completed')
  async onMeasurementCompleted(data: {
    length_mm: number;
    width_mm: number;
    ratio: number;
    confidence: number;
    coin_type: string;
    timestamp: string;
  }) {
    console.error(
      `📏 [EVENT] Foot measured: ${data.length_mm}×${data.width_mm}mm ` +
        `(ratio ${data.ratio}, confidence ${Math.round(data.confidence * 100)}%) ` +
        `using ${data.coin_type} at ${data.timestamp}`
    );
  }

  @OnEvent('shoefit.database.refreshed')
  async onDatabaseRefreshed(data: {
    total_shoes: number;
    scraped_count: number;
    fallback_count: number;
    error_count: number;
    timestamp: string;
  }) {
    console.error(
      `🔄 [EVENT] Shoe database refreshed: ${data.total_shoes} total ` +
        `(${data.scraped_count} scraped, ${data.fallback_count} fallback, ` +
        `${data.error_count} errors) at ${data.timestamp}`
    );
  }
}
