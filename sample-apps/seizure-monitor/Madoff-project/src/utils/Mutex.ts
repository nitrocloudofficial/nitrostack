export class Mutex {
  private queue: Array<() => void> = [];
  private isLocked: boolean = false;

  async acquire(): Promise<void> {
    if (!this.isLocked) {
      this.isLocked = true;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const nextResolve = this.queue.shift();
      if (nextResolve) {
        nextResolve();
      }
    } else {
      this.isLocked = false;
    }
  }

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await callback();
    } finally {
      this.release();
    }
  }
}
