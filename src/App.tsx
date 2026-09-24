import { BrowserRouter, Route, Routes } from "react-router";
import { createMockLayersApi } from "./api/createMockLayersApi";
import { createLayersController } from "./core/createLayersController";
import { createEventLog } from "./core/eventLog";
import { MapPage } from "./pages/MapPage";
import { LayersControllerProvider } from "./state/controllerContext";
import { LayersProvider, layersStore } from "./state/layersStore";

// Composition root: created once, outside React, so the controller never depends on render.
const api = createMockLayersApi({ failureRate: 0.2, latencyMs: { min: 400, max: 1200 } });
const eventLog = createEventLog();
const controller = createLayersController(layersStore, api, eventLog);

export function App() {
  return (
    <LayersProvider>
      <LayersControllerProvider controller={controller}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MapPage />} />
          </Routes>
        </BrowserRouter>
      </LayersControllerProvider>
    </LayersProvider>
  );
}
