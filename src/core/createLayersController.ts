/**
 * Business logic: loading, cancellation, race protection.
 * The ONLY place that writes to the store (`patch` and `replaceLayers`). Knows nothing about React.
 */
import type Vedro from "vedro";
import { toLayerError, type LayersApi } from "../api/LayersApi";
import type { Layer, LayerId, LayersState } from "../domain/layer.types";
import type { EventLog } from "./eventLog";

export interface LayersController {
  readonly setEnabled: (id: LayerId, enabled: boolean) => void;
  readonly setOpacity: (id: LayerId, opacity: number) => void;
  readonly retry: (id: LayerId) => void;
  readonly replaceLayers: (layers: readonly Layer[]) => void;
  /** Teardown, not reset. For reset use `replaceLayers`. */
  readonly dispose: () => void;
}

// Factory, not a class: methods don't use `this`, so `const { setEnabled } = controller`
// is safe and references stay stable without `.bind`.
export function createLayersController(
  store: Vedro<LayersState>,
  api: LayersApi,
  log: EventLog,
): LayersController {
  // The AbortController itself is the generation token: a response is stale
  // iff `inflight.get(id) !== ac`. No separate epoch counter to keep in sync.
  const inflight = new Map<LayerId, AbortController>();
  // Log numbering only, never affects logic.
  const seq = new Map<LayerId, number>();

  const patch = (id: LayerId, fn: (l: Layer) => Layer): void => {
    // get(key), not get(): get() returns a fresh `{...state}` copy on every call.
    const byId = store.get("byId");
    const prev = byId[id];
    if (!prev) return;
    const next = fn(prev);
    if (next === prev) return;
    // Only the changed layer gets a new object; other references survive,
    // which is what lets React bail out on the other rows.
    store.dispatch("byId", { ...byId, [id]: next });
  };

  const cancel = (id: LayerId): void => {
    inflight.get(id)?.abort();
    inflight.delete(id);
  };

  const abortAll = (): void => {
    inflight.forEach((ac) => ac.abort());
    inflight.clear();
    seq.clear();
  };

  // Two barriers, both needed: abort() frees the network but can lose to an already
  // resolved response; the identity check keeps a stale response out of the store
  // but doesn't free the connection.
  const load = async (id: LayerId): Promise<void> => {
    inflight.get(id)?.abort();
    const ac = new AbortController();
    inflight.set(id, ac);

    const n = (seq.get(id) ?? 0) + 1;
    seq.set(id, n);
    log.started(id, n);

    try {
      const payload = await api.fetchLayer(id, ac.signal);
      if (inflight.get(id) !== ac) {
        log.dropped(id, n);
        return;
      }
      log.settled(id, n, "success");
      patch(id, (l) => ({ ...l, load: { status: "success", payload } }));
    } catch (e) {
      if (ac.signal.aborted) {
        log.cancelled(id, n);
        return;
      }
      if (inflight.get(id) !== ac) {
        log.dropped(id, n);
        return;
      }
      log.settled(id, n, "error");
      patch(id, (l) => ({ ...l, load: { status: "error", error: toLayerError(e) } }));
    } finally {
      if (inflight.get(id) === ac) inflight.delete(id);
    }
  };

  return {
    setEnabled(id, enabled) {
      if (!enabled) {
        cancel(id);
        patch(id, (l) => ({ ...l, enabled: false, load: { status: "idle" } }));
        return;
      }
      patch(id, (l) => ({ ...l, enabled: true, load: { status: "loading" } }));
      void load(id);
    },
    setOpacity(id, opacity) {
      patch(id, (l) => ({ ...l, opacity }));
    },
    retry(id) {
      patch(id, (l) => ({ ...l, load: { status: "loading" } }));
      void load(id);
    },
    replaceLayers(layers) {
      abortAll();
      // seq restarts at #1 for the new set; old entries with the same numbers would only mislead.
      log.clear();
      // Atomic: both top-level keys already exist, so vedro's key check in updateParial passes.
      store.dispatch({
        byId: Object.fromEntries(layers.map((l) => [l.id, l])) as Record<LayerId, Layer>,
        allIds: layers.map((l) => l.id),
      });
    },
    dispose: abortAll,
  };
}
