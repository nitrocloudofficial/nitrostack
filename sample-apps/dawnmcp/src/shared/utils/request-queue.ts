/**
 * Single-Concurrency Request Queue
 *
 * Enforces sequential execution for local AI calls (LLM chat and embeddings).
 * Prevents Ollama / GPU memory thrashing when indexing or handling parallel requests.
 */
export class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  /**
   * Enqueue an async operation and wait for its completion.
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const nextTask = this.queue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch {
        // Errors are caught and handled by the task promise wrapper
      }
    }

    this.processing = false;
    this.processNext();
  }
}

/** Global shared request queue for Ollama AI operations. */
export const sharedAiQueue = new RequestQueue();
