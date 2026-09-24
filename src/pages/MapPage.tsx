import { useEffect, useState } from "react";
import { CHAOS_FAST_MS, CHAOS_SLOW_MS, type MockLayersApi } from "../api/createMockLayersApi";
import type { EventLog } from "../core/eventLog";
import type { Layer, LayerId, LayerKind } from "../domain/layer.types";
import { useLayersController } from "../state/controllerContext";
import { EventLogPanel } from "../ui/EventLogPanel";
import { LayerPanel } from "../ui/LayerPanel";
import { Controls, Hint } from "../ui/styled";

const layer = (kind: LayerKind, title: string): Layer => ({
  id: kind as LayerId,
  kind,
  title,
  enabled: false,
  opacity: 0.7,
  load: { status: "idle" },
});

const LAYERS: readonly Layer[] = [
  layer("temperature", "Температура"),
  layer("wind", "Ветер"),
  layer("insolation", "Инсоляция"),
];

interface Props {
  readonly api: MockLayersApi;
  readonly log: EventLog;
}

export function MapPage({ api, log }: Props) {
  const { replaceLayers } = useLayersController();
  // Page-local UI state, not store state: nothing else needs to know about it.
  const [chaos, setChaos] = useState(false);

  // Idempotent, so StrictMode's double effect is harmless.
  useEffect(() => {
    replaceLayers(LAYERS);
  }, [replaceLayers]);

  // The mock outlives the page; without this, coming back would show the toggle off
  // while the mock is still in chaos mode.
  useEffect(() => () => api.setChaos(false), [api]);

  const toggleChaos = (on: boolean): void => {
    api.setChaos(on);
    setChaos(on);
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>GIS-слои</h1>
      <LayerPanel />
      <Controls>
        <label>
          <input type="checkbox" checked={chaos} onChange={(e) => toggleChaos(e.target.checked)} />{" "}
          Хаос-режим
        </label>
        <Hint>
          нечётный запрос слоя: {CHAOS_SLOW_MS} мс, доезжает несмотря на отмену · чётный:{" "}
          {CHAOS_FAST_MS} мс. Попробуйте: вкл → выкл → вкл.
        </Hint>
      </Controls>
      <EventLogPanel log={log} />
    </main>
  );
}
