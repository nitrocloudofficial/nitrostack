export class PacketRateTracker {
  private timestamps: number[] = [];
  private windowMs = 5000;

  record(): number {
    const now = Date.now();
    this.timestamps.push(now);
    this.prune(now);
    return this.getRate(now);
  }

  getRate(now: number = Date.now()): number {
    this.prune(now);
    if (this.timestamps.length < 2) {
      return this.timestamps.length;
    }
    const elapsed = (now - this.timestamps[0]) / 1000;
    if (elapsed <= 0) {
      return 0;
    }
    return Math.round((this.timestamps.length / elapsed) * 10) / 10;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}

export const packetRateTracker = new PacketRateTracker();
