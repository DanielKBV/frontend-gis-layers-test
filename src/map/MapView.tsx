/**
 * The whole src/map folder is optional: deleting it (plus its one import in MapPage)
 * leaves the rest of the app untouched — proof that state doesn't leak into the view.
 */
import "maplibre-gl/dist/maplibre-gl.css";
import { MapLibreMap } from "maplibre-gl";
import { memo, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { MapBindings } from "./MapBindings";

const MapCanvas = styled.div`
  position: absolute;
  inset: 0;
`;

export const MapView = memo(function MapView() {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const m = new MapLibreMap({
      container: ref.current,
      style: "https://demotiles.maplibre.org/style.json", // no API key needed
      center: [74.59, 42.87], // Bishkek
      zoom: 6,
    });
    m.once("load", () => setMap(m));
    return () => {
      setMap(null);
      m.remove();
    };
  }, []);

  return (
    <>
      <MapCanvas ref={ref} />
      {map && <MapBindings map={map} />}
    </>
  );
});
