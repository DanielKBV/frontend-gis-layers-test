import type { Feature, Polygon } from "geojson";
import type { LayerId, LayerPayload } from "../domain/layer.types";

const CENTER: readonly [number, number] = [74.59, 42.87]; // Bishkek
const SPREAD_DEG = 3;
const CELL_DEG = 0.25;

/** Synthetic layer data: random square cells around Bishkek with a 0..1 `value`. */
export function buildPayload(id: LayerId, rng: () => number): LayerPayload {
  const count = 20 + Math.floor(rng() * 40);
  const features: Feature<Polygon, { readonly value: number }>[] = [];

  for (let i = 0; i < count; i++) {
    const lng = CENTER[0] + (rng() - 0.5) * 2 * SPREAD_DEG;
    const lat = CENTER[1] + (rng() - 0.5) * 2 * SPREAD_DEG;
    features.push({
      type: "Feature",
      id: `${id}-${i}`,
      properties: { value: rng() },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [lng, lat],
            [lng + CELL_DEG, lat],
            [lng + CELL_DEG, lat + CELL_DEG],
            [lng, lat + CELL_DEG],
            [lng, lat],
          ],
        ],
      },
    });
  }

  return {
    geojson: { type: "FeatureCollection", features },
    featureCount: count,
    fetchedAt: Date.now(),
  };
}
