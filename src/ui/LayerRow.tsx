import { memo, type ReactNode } from "react";
import type { LayerId } from "../domain/layer.types";
import { useLayersController } from "../state/controllerContext";
import { useLayer } from "../state/hooks";
import { LayerStatus } from "./LayerStatus";
import { Row, Title } from "./styled";

interface Props {
  readonly id: LayerId;
  /** Extra trailing cell, e.g. the render counter on /stress. */
  readonly children?: ReactNode;
}

export const LayerRow = memo(function LayerRow({ id, children }: Props) {
  const layer = useLayer(id);
  const { setEnabled, setOpacity, retry } = useLayersController();
  // Layer removed by replaceLayers; this row unmounts on the list's next render.
  if (!layer) return null;

  // Handlers intentionally not wrapped in useCallback: the row re-renders only when
  // its own layer changes, and then its children re-render regardless.
  return (
    <Row>
      <input
        type="checkbox"
        checked={layer.enabled}
        onChange={(e) => setEnabled(id, e.target.checked)}
        aria-label={layer.title}
      />
      <Title>{layer.title}</Title>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={layer.opacity}
        disabled={!layer.enabled}
        onChange={(e) => setOpacity(id, e.target.valueAsNumber)}
        aria-label={`Прозрачность: ${layer.title}`}
      />
      <LayerStatus load={layer.load} onRetry={() => retry(id)} />
      {children}
    </Row>
  );
});
