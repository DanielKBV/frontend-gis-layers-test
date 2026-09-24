import { createContext, use, type ReactNode } from "react";
import type { LayersController } from "../core/createLayersController";

const ControllerContext = createContext<LayersController | null>(null);

export function LayersControllerProvider({
  controller,
  children,
}: {
  readonly controller: LayersController;
  readonly children: ReactNode;
}) {
  return <ControllerContext value={controller}>{children}</ControllerContext>;
}

export function useLayersController(): LayersController {
  const controller = use(ControllerContext);
  if (!controller)
    throw new Error("useLayersController must be used inside LayersControllerProvider");
  return controller;
}
