import { Injectable } from '@nitrostack/core';

export enum TrafficClass {
  CRITICAL_TELLER = 'CRITICAL_TELLER',
  MONEY_TRANSFER = 'MONEY_TRANSFER',
  EOD_BATCH = 'EOD_BATCH',
  NON_CRITICAL = 'NON_CRITICAL'
}

@Injectable()
export class QosShunting {
  private tokens = {
    [TrafficClass.CRITICAL_TELLER]: 90,
    [TrafficClass.MONEY_TRANSFER]: 90,
    [TrafficClass.EOD_BATCH]: 10,
    [TrafficClass.NON_CRITICAL]: 10
  };
  
  private maxTokens = {
    [TrafficClass.CRITICAL_TELLER]: 90,
    [TrafficClass.MONEY_TRANSFER]: 90,
    [TrafficClass.EOD_BATCH]: 10,
    [TrafficClass.NON_CRITICAL]: 10
  };

  private refillRateMs = 1000;
  private interval: ReturnType<typeof setInterval>;
  public isActive = false;

  constructor() {
    this.interval = setInterval(() => this.refill(), this.refillRateMs);
    if (this.interval.unref) this.interval.unref();
  }

  /**
   * Token-Bucket Adaptive Admission Control
   * Returns true if traffic is admitted, false if throttled.
   */
  admit(trafficClass: TrafficClass): boolean {
    if (!this.isActive) return true;

    // If critical/money transfer, we group them into the 90% bandwidth pool
    const pool = (trafficClass === TrafficClass.CRITICAL_TELLER || trafficClass === TrafficClass.MONEY_TRANSFER) 
      ? TrafficClass.CRITICAL_TELLER 
      : TrafficClass.EOD_BATCH;

    if (this.tokens[pool] > 0) {
      this.tokens[pool]--;
      return true;
    }

    return false; // Throttled
  }

  private refill() {
    this.tokens[TrafficClass.CRITICAL_TELLER] = this.maxTokens[TrafficClass.CRITICAL_TELLER];
    this.tokens[TrafficClass.EOD_BATCH] = this.maxTokens[TrafficClass.EOD_BATCH];
  }
}
