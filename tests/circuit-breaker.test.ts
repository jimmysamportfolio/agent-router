import { CircuitBreaker } from "@/server/pipeline/guardrails/circuit-breaker";

describe("CircuitBreaker", () => {
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
    const cb = new CircuitBreaker({ windowSize: 4, failureThreshold: 0.5 });

    // 3 failures out of 4 calls (75% > 50% threshold)
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.resolve("ok")).catch(() => {});
    }
    // Still might be closed, need actual failures
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}

    expect(cb.getState()).toBe("open");
  });

  it("rejects calls when open", async () => {
    const cb = new CircuitBreaker({ windowSize: 2, failureThreshold: 0.4 });

    // Force open
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

    // Force open
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    expect(cb.getState()).toBe("open");

    // Advance time past recovery timeout
    vi.advanceTimersByTime(1001);

    // Next call should transition to half_open and succeed
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("closed");

    vi.useRealTimers();
  });

  it("re-opens from half_open on failure", async () => {
    vi.useFakeTimers();

    const cb = new CircuitBreaker({
      windowSize: 2,
      failureThreshold: 0.4,
      recoveryTimeoutMs: 1000,
    });

    // Force open
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error("fail")));
    } catch {}
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1001);

    // Fail in half_open → back to open
    try {
      await cb.execute(() => Promise.reject(new Error("fail again")));
    } catch {}
    expect(cb.getState()).toBe("open");

    vi.useRealTimers();
  });
});
