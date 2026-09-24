/**
 * Imperative MapLibre calls, kept out of components. Layer id on the map === LayerId.
 */
import type { FeatureCollection } from "geojson";
import type { MapLibreMap } from "maplibre-gl";
import type { LayerId, LayerKind } from "../domain/layer.types";

const PALETTE: Record<LayerKind, readonly [low: string, high: string]> = {
  temperature: ["#2c7bb6", "#d7191c"],
  wind: ["#a6dba0", "#762a83"],
  insolation: ["#fee08b", "#f46d43"],
};

const sourceId = (id: LayerId): string => `src:${id}`;

export function addToMap(
  map: MapLibreMap,
  id: LayerId,
  kind: LayerKind,
  geojson: FeatureCollection,
): void {
  removeFromMap(map, id);
  const [low, high] = PALETTE[kind];
  map.addSource(sourceId(id), { type: "geojson", data: geojson });
  map.addLayer({
    id,
    type: "fill",
    source: sourceId(id),
    paint: {
      "fill-color": ["interpolate", ["linear"], ["get", "value"], 0, low, 1, high],
      "fill-outline-color": "#ffffff",
    },
  });
}

export function setLayerOpacity(map: MapLibreMap, id: LayerId, opacity: number): void {
  if (map.getLayer(id)) map.setPaintProperty(id, "fill-opacity", opacity);
}

export function removeFromMap(map: MapLibreMap, id: LayerId): void {
  // The map may already be removed: MapView's cleanup can run before the bindings'
  // cleanups, and Map.remove() → setStyle(null) deletes `map.style`, after which
  // getLayer() throws.
  if (!map.style) return;
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(sourceId(id))) map.removeSource(sourceId(id));
}
