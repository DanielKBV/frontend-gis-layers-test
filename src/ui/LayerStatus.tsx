import type { LayerLoad } from "../domain/layer.types";
import { Badge } from "./styled";

interface Props {
  readonly load: LayerLoad;
  readonly onRetry: () => void;
}

export function LayerStatus({ load, onRetry }: Props) {
  switch (load.status) {
    case "idle":
      return null;
    case "loading":
      return <Badge $tone="info">загрузка…</Badge>;
    case "success":
      return <Badge $tone="ok">{load.payload.featureCount} объектов</Badge>;
    case "error":
      return (
        <Badge $tone="err">
          {load.error.message}
          {load.error.retryable && (
            <button type="button" onClick={onRetry}>
              Повторить
            </button>
          )}
        </Badge>
      );
    default:
      // A new status added to LayerLoad becomes a compile error here.
      return assertNever(load);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled layer status: ${JSON.stringify(value)}`);
}
