import { memo } from "react";
import { useLayerIds } from "../state/hooks";
import { LayerRow } from "./LayerRow";
import { List } from "./styled";

// Subscribed to "allIds" only: per-layer updates dispatch "byId" and never wake the list.
export const LayerPanel = memo(function LayerPanel() {
  const ids = useLayerIds();
  return (
    <List>
      {ids.map((id) => (
        <LayerRow key={id} id={id} />
      ))}
    </List>
  );
});
