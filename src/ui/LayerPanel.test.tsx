// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { LayersApi } from "../api/LayersApi";
import { createLayersController } from "../core/createLayersController";
import { createEventLog } from "../core/eventLog";
import type { Layer, LayerId, LayerLoad } from "../domain/layer.types";
import { LayersControllerProvider } from "../state/controllerContext";
import { LayersProvider, layersStore } from "../state/layersStore";
import { LayerPanel } from "./LayerPanel";

// LayerStatus renders exactly once per LayerRow render, so it doubles as a row render counter.
const renders = vi.hoisted(() => [] as string[]);
vi.mock("./LayerStatus", () => ({
  LayerStatus: ({ load }: { load: LayerLoad }) => {
    renders.push(load.status);
    return null;
  },
}));

const makeLayers = (n: number): Layer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `layer-${i + 1}` as LayerId,
    kind: "temperature",
    title: `Layer ${i + 1}`,
    enabled: false,
    opacity: 1,
    load: { status: "idle" },
  }));

function setup(n: number) {
  // Never resolves: the only state change under test is the synchronous "loading" patch.
  const api: LayersApi = { fetchLayer: () => new Promise(() => {}) };
  const controller = createLayersController(layersStore, api, createEventLog());
  act(() => controller.replaceLayers(makeLayers(n)));
  render(
    <LayersProvider>
      <LayersControllerProvider controller={controller}>
        <LayerPanel />
      </LayersControllerProvider>
    </LayersProvider>,
  );
  return controller;
}

afterEach(() => {
  cleanup();
  renders.length = 0;
});

it("5. 100 layers: toggling one re-renders exactly one row", () => {
  const controller = setup(100);
  expect(renders).toHaveLength(100);

  act(() => controller.setEnabled("layer-7" as LayerId, true));

  expect(renders).toHaveLength(101);
  expect(renders.at(-1)).toBe("loading");
});

it("shrinking 100 → 3 → 100 layers does not throw on removed rows", () => {
  const controller = setup(100);

  act(() => controller.replaceLayers(makeLayers(3)));
  expect(document.querySelectorAll("li")).toHaveLength(3);

  act(() => controller.replaceLayers(makeLayers(100)));
  expect(document.querySelectorAll("li")).toHaveLength(100);
});
