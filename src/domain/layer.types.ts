/**
 * Domain model. No runtime code and no dependencies on React, the store or the API.
 */
import type { FeatureCollection } from "geojson";

export type LayerId = string & { readonly __brand: "LayerId" };
export type LayerKind = "temperature" | "wind" | "insolation";

export interface LayerPayload {
  readonly geojson: FeatureCollection;
  readonly featureCount: number;
  readonly fetchedAt: number;
}

export interface LayerError {
  readonly message: string;
  readonly retryable: boolean;
}

/** `payload` exists only in `success`, `error` only in `error` — invalid combinations don't compile. */
export type LayerLoad =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly payload: LayerPayload }
  | { readonly status: "error"; readonly error: LayerError };

export interface Layer {
  readonly id: LayerId;
  readonly kind: LayerKind;
  readonly title: string;
  readonly enabled: boolean;
  /** 0..1 */
  readonly opacity: number;
  readonly load: LayerLoad;
}

export interface LayersState {
  readonly byId: Readonly<Record<LayerId, Layer>>;
  readonly allIds: readonly LayerId[];
}
