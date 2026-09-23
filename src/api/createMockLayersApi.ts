/**
 * In-memory LayersApi with latency, random failures and AbortSignal support.
 * Chaos mode makes the "old response arrives after the new one" race reproducible.
 */
import type { LayerId, LayerPayload } from "../domain/layer.types";
import { buildPayload } from "./buildPayload";
import { AbortError, ApiError, type LayersApi } from "./LayersApi";

export interface MockOptions {
  /** Deterministic RNG → reproducible tests. */
  readonly seed?: number;
  /** 0..1 */
  readonly failureRate: number;
  readonly latencyMs: { readonly min: number; readonly max: number };
  readonly chaos?: boolean;
}

/** `setChaos` lives on the mock only: the controller takes `LayersApi` and never sees it. */
export interface MockLayersApi extends LayersApi {
  readonly setChaos: (on: boolean) => void;
}

export const CHAOS_SLOW_MS = 2500;
export const CHAOS_FAST_MS = 300;

export function createMockLayersApi(opts: MockOptions): MockLayersApi {
  const rng = makeRng(opts.seed ?? 42);
  const calls = new Map<LayerId, number>();
  let chaos = opts.chaos ?? false;

  const pickLatency = (): number =>
    opts.latencyMs.min + Math.floor(rng() * (opts.latencyMs.max - opts.latencyMs.min));

  return {
    fetchLayer(id, signal) {
      const n = (calls.get(id) ?? 0) + 1;
      calls.set(id, n);
      // Parity, not "first request only": the call counter never resets, so a one-off slow
      // request would make the demo work once per tab lifetime.
      const slow = chaos && n % 2 === 1;
      const latency = chaos ? (slow ? CHAOS_SLOW_MS : CHAOS_FAST_MS) : pickLatency();

      return new Promise<LayerPayload>((resolve, reject) => {
        // Slow chaos requests deliberately ignore the signal: they simulate a server that has
        // already sent the response. That is the window between abort() and a resolved promise
        // the controller's second race barrier exists for. The only intentional live timer
        // after abort — bounded to one per layer for CHAOS_SLOW_MS.
        if (signal.aborted && !slow) return reject(new AbortError());

        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          if (rng() < opts.failureRate) {
            return reject(new ApiError("Сервис слоёв недоступен", { retryable: true }));
          }
          resolve(buildPayload(id, rng));
        }, latency);

        // clearTimeout on abort: otherwise every cancelled request keeps a live timer
        // holding a closure until it fires.
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(new AbortError());
        };
        if (!slow) signal.addEventListener("abort", onAbort, { once: true });
      });
    },
    setChaos(on) {
      chaos = on;
    },
  };
}

/** mulberry32 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
