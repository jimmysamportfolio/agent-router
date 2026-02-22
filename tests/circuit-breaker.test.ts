import { CircuitBreaker } from "@/server/pipeline/guardrails/circuit-breaker";

describe("CircuitBreaker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in closed state", () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
  });

  it("stays closed on success", async () => {
    const cb = new CircuitBreaker();
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("closed");
  });

  it("opens after exceeding failure threshold", async () => {
    const cb = new CircuitBreaker({ windowSize: 3, failureThreshold: 0.5 });

    // 3 failures fill the window (100% > 50% threshold) — the circuit opens
    // on the 3rd recordFailure call; a 4th execute throws before calling fn.
    for (let i = 0; i < 4; i++) {
      try {
        await cb.execute(() => Promise.reject(new Error("fail")));
      } catch {}
    }

    expect(cb.getState()).toBe("open");
  });

  it("rejects calls when open", async () => {
    const cb = new CircuitBreaker({ windowSize: 2, failureThreshold: 0.4 });

    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}

    expect(cb.getState()).toBe("open");
    await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(
      "Circuit breaker is open",
    );
  });

  it("transitions to half_open after recovery timeout", async () => {
    vi.useFakeTimers();

    const cb = new CircuitBreaker({
      windowSize: 2,
      failureThreshold: 0.4,
      recoveryTimeoutMs: 1000,
    });

    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1001);

    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("closed");
  });

  it("re-opens from half_open on failure", async () => {
    vi.useFakeTimers();

    const cb = new CircuitBreaker({
      windowSize: 2,
      failureThreshold: 0.4,
      recoveryTimeoutMs: 1000,
    });

    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1001);

    try {
      await cb.execute(() => Promise.reject(new Error("fail again")));
    } catch {}
    expect(cb.getState()).toBe("open");
  });

  it("clamps windowSize to a minimum of 1", async () => {
    const cb = new CircuitBreaker({ windowSize: 0, failureThreshold: 0.5 });

    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}

    expect(cb.getState()).toBe("open");
  });
});
