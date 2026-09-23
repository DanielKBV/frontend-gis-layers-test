import Vedro from "vedro";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type LayersApi } from "../api/LayersApi";
import { CHAOS_FAST_MS, CHAOS_SLOW_MS, createMockLayersApi } from "../api/createMockLayersApi";
import type { Layer, LayerId, LayerPayload, LayersState } from "../domain/layer.types";
import { createLayersController } from "./createLayersController";
import { createEventLog } from "./eventLog";

const T = "temperature" as LayerId;

const makeLayer = (id: LayerId): Layer => ({
  id,
  kind: "temperature",
  title: id,
  enabled: false,
  opacity: 1,
  load: { status: "idle" },
});

function setup(api: LayersApi, ids: readonly LayerId[] = [T]) {
  const store = new Vedro<LayersState>("test", { byId: {}, allIds: [] });
  const log = createEventLog();
  const controller = createLayersController(store, api, log);
  controller.replaceLayers(ids.map(makeLayer));
  const layer = (id: LayerId = T): Layer => {
    const l = store.get("byId")[id];
    if (!l) throw new Error(`layer ${id} missing`);
    return l;
  };
  const events = () => log.getEntries().map((e) => `#${e.n} ${e.event}`);
  return { controller, layer, events };
}

/** Records every signal the controller hands to the API. */
function spySignals(api: LayersApi) {
  const signals: AbortSignal[] = [];
  const wrapped: LayersApi = {
    fetchLayer: (id, signal) => {
      signals.push(signal);
      return api.fetchLayer(id, signal);
    },
  };
  return { api: wrapped, signals };
}

const mock = (chaos: boolean) =>
  createMockLayersApi({ failureRate: 0, latencyMs: { min: 100, max: 100 }, chaos });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createLayersController", () => {
  it("1. on→off→on: a stale response arriving after the fresh one is dropped", async () => {
    // Chaos mock: request #1 is slow and ignores abort, #2 is fast — the old
    // response reaches the controller after the new one. A mock that honours abort
    // would only exercise cancellation, not the race.
    const { controller, layer, events } = setup(mock(true));

    controller.setEnabled(T, true);
    controller.setEnabled(T, false);
    controller.setEnabled(T, true);

    await vi.advanceTimersByTimeAsync(CHAOS_FAST_MS);
    const fresh = layer().load;
    expect(fresh.status).toBe("success");

    await vi.advanceTimersByTimeAsync(CHAOS_SLOW_MS);
    expect(layer().load).toBe(fresh);
    expect(events()).toEqual(["#1 started", "#2 started", "#2 success", "#1 dropped"]);
  });

  it("2. disabling mid-flight aborts the request and resets status to idle", async () => {
    const { api, signals } = spySignals(mock(false));
    const { controller, layer, events } = setup(api);

    controller.setEnabled(T, true);
    expect(layer().load.status).toBe("loading");

    controller.setEnabled(T, false);
    expect(signals[0]?.aborted).toBe(true);
    expect(layer().load.status).toBe("idle");

    await vi.runAllTimersAsync();
    expect(layer().load.status).toBe("idle");
    expect(events()).toEqual(["#1 started", "#1 cancelled"]);
  });

  it("3. retry after an error goes loading → success", async () => {
    const payload: LayerPayload = {
      geojson: { type: "FeatureCollection", features: [] },
      featureCount: 0,
      fetchedAt: 0,
    };
    const fetchLayer = vi
      .fn<LayersApi["fetchLayer"]>()
      .mockRejectedValueOnce(new ApiError("down", { retryable: true }))
      .mockResolvedValueOnce(payload);
    const { controller, layer } = setup({ fetchLayer });

    controller.setEnabled(T, true);
    await vi.runAllTimersAsync();
    expect(layer().load).toEqual({ status: "error", error: { message: "down", retryable: true } });

    controller.retry(T);
    expect(layer().load.status).toBe("loading");

    await vi.runAllTimersAsync();
    expect(layer().load).toEqual({ status: "success", payload });
  });

  it("4. dispose leaves no live timers and no pending requests", async () => {
    const ids = ["a", "b", "c"] as LayerId[];
    const { api, signals } = spySignals(mock(false));
    const { controller, layer } = setup(api, ids);

    ids.forEach((id) => controller.setEnabled(id, true));
    expect(vi.getTimerCount()).toBe(3);

    controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(signals.every((s) => s.aborted)).toBe(true);

    // No store writes after teardown: layers stay frozen where dispose found them.
    await vi.runAllTimersAsync();
    ids.forEach((id) => expect(layer(id).load.status).toBe("loading"));
  });
});
