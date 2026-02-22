type State = "closed" | "open" | "half_open";

const DEFAULT_FAILURE_THRESHOLD = 0.5;
const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_RECOVERY_TIMEOUT_MS = 30_000;

export class CircuitBreaker {
  private state: State = "closed";
  private results: boolean[] = [];
  private lastFailureTime = 0;
  private inFlightProbe = false;
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
    this.windowSize = Math.max(1, options?.windowSize ?? DEFAULT_WINDOW_SIZE);
    this.recoveryTimeoutMs =
      options?.recoveryTimeoutMs ?? DEFAULT_RECOVERY_TIMEOUT_MS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
        this.state = "half_open";
        this.inFlightProbe = false;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    if (this.state === "half_open") {
      if (this.inFlightProbe) {
        throw new Error("Circuit breaker is open");
      }
      this.inFlightProbe = true;
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
    this.inFlightProbe = false;
    this.results.push(true);
    if (this.results.length > this.windowSize) {
      this.results.shift();
    }
    if (this.state === "half_open") {
      this.state = "closed";
      this.results = [];
      this.lastFailureTime = 0;
    }
  }

  private recordFailure(): void {
    this.inFlightProbe = false;
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
    if (
      failureRate > this.failureThreshold &&
      this.results.length >= this.windowSize
    ) {
      this.state = "open";
    }
  }

  getState(): State {
    return this.state;
  }
}
