/**
 * The store instance lives outside React: the controller writes to it directly.
 * Do not write to it from components — all writes go through the controller.
 */
import VedroImport, { createVedro } from "vedro";
import type { LayersState } from "../domain/layer.types";

// vedro ships CommonJS with `exports.default = Vedro`. Vite 8 (Rolldown) follows Node
// semantics, so the default import is the whole module.exports object, not the class;
// Vitest unwraps it. Normalise once here. A deep import of "vedro/lib/_Vedro" was rejected:
// a second module instance would break the `instanceof Vedro` check inside Provider.
const Vedro: typeof VedroImport =
  (VedroImport as unknown as { readonly default?: typeof VedroImport }).default ?? VedroImport;

// Exactly two top-level keys: vedro's Dispatcher copies the whole top level three
// times per dispatch (lib/_internal/_Dispatcher.js), so its width must not grow with N.
export const layersStore = new Vedro<LayersState>("layers", { byId: {}, allIds: [] });

// Passing a ready instance (not an initial state) keeps Provider on the
// `instanceof Vedro` branch of its useRef ternary — no throwaway Vedro per render
// (lib/_createVedro.js). useSelector/useDispatch are deliberately unused: see hooks.ts.
export const { Provider: LayersProvider, useStore: useLayersStore } = createVedro(layersStore);
