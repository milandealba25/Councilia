import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter, clientKeyFromHeaders } from "./rateLimit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite peticiones dentro de la capacidad", () => {
    const lim = new RateLimiter({ capacity: 3, refillPerSec: 1 });
    expect(lim.consume("k").allowed).toBe(true);
    expect(lim.consume("k").allowed).toBe(true);
    expect(lim.consume("k").allowed).toBe(true);
    expect(lim.consume("k").allowed).toBe(false);
  });

  it("recarga tokens con el paso del tiempo", () => {
    const lim = new RateLimiter({ capacity: 2, refillPerSec: 1 });
    expect(lim.consume("k").allowed).toBe(true);
    expect(lim.consume("k").allowed).toBe(true);
    expect(lim.consume("k").allowed).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(lim.consume("k").allowed).toBe(true);
  });

  it("aisla buckets por clave", () => {
    const lim = new RateLimiter({ capacity: 1, refillPerSec: 1 });
    expect(lim.consume("a").allowed).toBe(true);
    expect(lim.consume("a").allowed).toBe(false);
    expect(lim.consume("b").allowed).toBe(true);
  });

  it("retryAfterMs se aproxima al tiempo para recuperar el costo", () => {
    const lim = new RateLimiter({ capacity: 1, refillPerSec: 1 });
    lim.consume("k");
    const r = lim.consume("k");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
    expect(r.retryAfterMs).toBeLessThanOrEqual(1000);
  });
});

describe("clientKeyFromHeaders", () => {
  it("prefiere el primer hop de x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientKeyFromHeaders(h)).toBe("1.2.3.4");
  });

  it("usa x-real-ip si no hay x-forwarded-for", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(clientKeyFromHeaders(h)).toBe("9.9.9.9");
  });

  it('devuelve "anon" como fallback', () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("anon");
  });
});
