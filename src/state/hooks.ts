/**
 * Subscriptions via useSyncExternalStore instead of vedro's useSelector, which subscribes
 * to "@state" (every component on every dispatch runs two JSON.stringify — the `===`
 * result is unconditionally overwritten by the stringify one), freezes the selector with
 * useEffect(..., []) and tears under concurrent rendering (lib/hooks/useStoreSelector.hook.js).
 * vedro's core fits the contract as is: on(key, cb) → unsubscribe, get(key) → snapshot.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { Layer, LayerId } from "../domain/layer.types";
import { useLayersStore } from "./layersStore";

// Landmine: getSnapshot must use get(key). get() without a key returns a fresh
// `{...state}` on every call → a new snapshot every time → infinite re-render.
// Note: vedro's on() invokes the callback synchronously on subscribe ("@init");
// harmless here — React just re-reads an unchanged snapshot.

export function useLayerIds(): readonly LayerId[] {
  const store = useLayersStore();
  return useSyncExternalStore(
    useCallback((cb: () => void) => store.on("allIds", cb), [store]),
    useCallback(() => store.get("allIds"), [store]),
  );
}

/**
 * `undefined` is real: after replaceLayers, rows of removed layers are still mounted
 * when "byId" notifies, before the list re-renders without them. Callers return null.
 */
export function useLayer(id: LayerId): Layer | undefined {
  const store = useLayersStore();
  return useSyncExternalStore(
    useCallback((cb: () => void) => store.on("byId", cb), [store]),
    useCallback(() => store.get("byId")[id], [store, id]),
  );
}
