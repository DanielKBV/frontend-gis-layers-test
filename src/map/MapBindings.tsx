/**
 * Second, independent consumer of the store: same hooks as the panel, no knowledge of it.
 * Renders nothing — translates declarative layer state into imperative MapLibre calls.
 */
import type { MapLibreMap } from "maplibre-gl";
import { memo, useEffect } from "react";
import type { LayerId } from "../domain/layer.types";
import { useLayer, useLayerIds } from "../state/hooks";
import { addToMap, removeFromMap, setLayerOpacity } from "./mapAdapters";

export function MapBindings({ map }: { readonly map: MapLibreMap }) {
  const ids = useLayerIds();
  return (
    <>
      {ids.map((id) => (
        <MapLayerBinding key={id} map={map} id={id} />
      ))}
    </>
  );
}

const MapLayerBinding = memo(function MapLayerBinding({
  map,
  id,
}: {
  readonly map: MapLibreMap;
  readonly id: LayerId;
}) {
  const layer = useLayer(id);
  // Unpacked before the effects: hooks can't be called conditionally, so a removed
  // layer (undefined) is handled inside them — no `kind` means "take it off the map".
  const kind = layer?.kind;
  const load = layer?.load;
  const opacity = layer?.opacity;

  // A layer is on the map only while enabled and loaded: disabling resets load to idle,
  // so no separate visibility toggle is needed.
  useEffect(() => {
    if (!kind || load?.status !== "success") {
      removeFromMap(map, id);
      return;
    }
    addToMap(map, id, kind, load.payload.geojson);
    return () => removeFromMap(map, id);
  }, [map, id, kind, load]);

  // `load` in deps on purpose: the layer is created when the response arrives, long after
  // opacity last changed — without it a freshly added layer would ignore the slider.
  useEffect(() => {
    if (opacity !== undefined) setLayerOpacity(map, id, opacity);
  }, [map, id, opacity, load]);

  return null;
});
