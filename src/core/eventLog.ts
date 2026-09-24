/**
 * Ring buffer of request lifecycle events. Exists to make race handling visible:
 * a correctly handled race otherwise looks exactly like "nothing happened".
 * Stores structured events only; wording is the UI's job.
 */
import type { LayerId } from "../domain/layer.types";

export type LogEvent = "started" | "cancelled" | "dropped" | "success" | "error";

export interface LogEntry {
  readonly at: number;
  readonly id: LayerId;
  /** Per-layer request number, consecutive: #1, #2, … */
  readonly n: number;
  readonly event: LogEvent;
}

export interface EventLog {
  readonly started: (id: LayerId, n: number) => void;
  readonly cancelled: (id: LayerId, n: number) => void;
  readonly dropped: (id: LayerId, n: number) => void;
  readonly settled: (id: LayerId, n: number, outcome: "success" | "error") => void;
  readonly clear: () => void;
  readonly getEntries: () => readonly LogEntry[];
  readonly subscribe: (cb: () => void) => () => void;
}

export function createEventLog(capacity = 50): EventLog {
  // Replaced, never mutated: the array itself is a useSyncExternalStore snapshot.
  let entries: readonly LogEntry[] = [];
  const listeners = new Set<() => void>();

  const notify = (): void => listeners.forEach((cb) => cb());

  const push = (id: LayerId, n: number, event: LogEvent): void => {
    entries = [...entries, { at: Date.now(), id, n, event }].slice(-capacity);
    notify();
  };

  return {
    started: (id, n) => push(id, n, "started"),
    cancelled: (id, n) => push(id, n, "cancelled"),
    dropped: (id, n) => push(id, n, "dropped"),
    settled: (id, n, outcome) => push(id, n, outcome),
    clear() {
      entries = [];
      notify();
    },
    getEntries: () => entries,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
