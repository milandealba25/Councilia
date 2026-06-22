/**
 * Q3 · Rate limiter in-memory simple (token bucket por clave).
 *
 * Adecuado para MVP single-instance en Vercel (cold starts pueden resetear
 * el bucket — aceptable como primera línea de defensa, no como seguridad).
 * En producción a escala, reemplazar por Upstash Redis o Vercel KV.
 */

export interface RateLimitOptions {
  /** Capacidad máxima del bucket (peticiones permitidas). */
  capacity: number;
  /** Cuántos tokens se regeneran por segundo. */
  refillPerSec: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly refillPerSec: number;

  constructor(opts: RateLimitOptions) {
    this.capacity = opts.capacity;
    this.refillPerSec = opts.refillPerSec;
  }

  consume(key: string, cost = 1): RateLimitResult {
    const now = Date.now();
    const existing = this.buckets.get(key);
    const bucket = existing
      ? this.refill(existing, now)
      : { tokens: this.capacity, updatedAt: now };

    if (bucket.tokens < cost) {
      const need = cost - bucket.tokens;
      const retryAfterMs = Math.max(
        0,
        Math.ceil((need / this.refillPerSec) * 1000),
      );
      this.buckets.set(key, bucket);
      return { allowed: false, remaining: Math.floor(bucket.tokens), retryAfterMs };
    }

    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
    };
  }

  reset(key?: string): void {
    if (key === undefined) this.buckets.clear();
    else this.buckets.delete(key);
  }

  private refill(b: Bucket, now: number): Bucket {
    const elapsedSec = (now - b.updatedAt) / 1000;
    const added = elapsedSec * this.refillPerSec;
    return {
      tokens: Math.min(this.capacity, b.tokens + added),
      updatedAt: now,
    };
  }
}

/** Limiter compartido para `/api/sessions/*`. 50 req/min ≈ 0.833/s. */
export const sessionsLimiter = new RateLimiter({
  capacity: 50,
  refillPerSec: 50 / 60,
});

/** Limiter para `/api/tts`. 15 req/min por usuario — cada petición cuesta dinero real. */
export const ttsLimiter = new RateLimiter({
  capacity: 15,
  refillPerSec: 15 / 60,
});

/**
 * Extrae una clave de cliente razonable. Preferimos el primer hop confiable
 * (Vercel pone `x-forwarded-for`); fallback a "anon" para no romper local.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "anon";
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}
