/**
 * The only contract the controller knows about. Swapping the mock for a real REST client
 * means one new implementation of `LayersApi` and zero changes in the controller or UI.
 */
import type { LayerError, LayerId, LayerPayload } from "../domain/layer.types";

export interface LayersApi {
  readonly fetchLayer: (id: LayerId, signal: AbortSignal) => Promise<LayerPayload>;
}

export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly retryable: boolean;

  constructor(message: string, options: { readonly retryable: boolean }) {
    super(message);
    this.retryable = options.retryable;
  }
}

export class AbortError extends Error {
  override readonly name = "AbortError";

  constructor() {
    super("Request aborted");
  }
}

export function toLayerError(e: unknown): LayerError {
  if (e instanceof ApiError) return { message: e.message, retryable: e.retryable };
  return { message: "Неизвестная ошибка", retryable: true };
}
