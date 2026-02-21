type State = "closed" | "open" | "half_open";

const DEFAULT_FAILURE_THRESHOLD = 0.5;
const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_RECOVERY_TIMEOUT_MS = 30_000;

export class CircuitBreaker {
  private state: State = "closed";
  private results: boolean[] = [];
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly windowSize: number;
  private readonly recoveryTimeoutMs: number;

  constructor(options?: {
    failureThreshold?: number;
    windowSize?: number;
    recoveryTimeoutMs?: number;
  }) {
    this.failureThreshold =
      options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.windowSize = options?.windowSize ?? DEFAULT_WINDOW_SIZE;
    this.recoveryTimeoutMs =
      options?.recoveryTimeoutMs ?? DEFAULT_RECOVERY_TIMEOUT_MS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
        this.state = "half_open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess(): void {
    this.results.push(true);
    if (this.results.length > this.windowSize) {
      this.results.shift();
    }
    if (this.state === "half_open") {
      this.state = "closed";
    }
  }

  private recordFailure(): void {
    this.results.push(false);
    if (this.results.length > this.windowSize) {
      this.results.shift();
    }
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      this.state = "open";
      return;
    }

    const failures = this.results.filter((r) => !r).length;
    const failureRate = failures / this.results.length;
    if (failureRate > this.failureThreshold && this.results.length >= 2) {
      this.state = "open";
    }
  }

  getState(): State {
    return this.state;
  }
}
