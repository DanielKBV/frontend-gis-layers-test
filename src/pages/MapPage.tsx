import { useEffect } from "react";
import type { Layer, LayerId, LayerKind } from "../domain/layer.types";
import { useLayersController } from "../state/controllerContext";
import { LayerPanel } from "../ui/LayerPanel";

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

export function MapPage() {
  const { replaceLayers } = useLayersController();

  // Idempotent, so StrictMode's double effect is harmless.
  useEffect(() => {
    replaceLayers(LAYERS);
  }, [replaceLayers]);

  return (
    <main style={{ padding: 16 }}>
      <h1>GIS-слои</h1>
      <LayerPanel />
    </main>
  );
}
