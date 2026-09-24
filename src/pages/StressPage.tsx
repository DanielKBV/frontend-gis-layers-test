/**
 * Scaling demo: 3…500 layers, each row shows how many times it has rendered.
 * No map here on purpose — MapLibre with 500 layers would slow down and blur the point.
 */
import { memo, Profiler, useCallback, useEffect, useRef, useState } from "react";
import type { ProfilerOnRenderCallback } from "react";
import type { Layer, LayerId, LayerKind } from "../domain/layer.types";
import { useLayersController } from "../state/controllerContext";
import { useLayerIds } from "../state/hooks";
import { LayerRow } from "../ui/LayerRow";
import { Controls, Counter, Hint, List } from "../ui/styled";

const SIZES = [3, 50, 100, 500] as const;
const INITIAL_SIZE = 100;
const KINDS: readonly LayerKind[] = ["temperature", "wind", "insolation"];

function makeLayers(n: number): Layer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `layer-${i + 1}` as LayerId,
    kind: KINDS[i % KINDS.length] ?? "temperature",
    title: `Слой ${i + 1}`,
    enabled: false,
    opacity: 0.7,
    load: { status: "idle" },
  }));
}

// Profiler, not a `useRef` counter bumped in render: StrictMode double-renders in dev,
// so a ref counter reads 2 on mount and +2 per update. Profiler reports real commits
// (dev builds only — React doesn't call onRender in production).
// Counts are written straight to the DOM: storing them in React state would make
// every count update itself a render.
const StressList = memo(function StressList() {
  const ids = useLayerIds();
  const counts = useRef(new Map<string, number>());
  const badges = useRef(new Map<string, HTMLElement>());

  const onRender = useCallback<ProfilerOnRenderCallback>((id) => {
    const n = (counts.current.get(id) ?? 0) + 1;
    counts.current.set(id, n);
    const el = badges.current.get(id);
    if (el) el.textContent = `рендеров: ${n}`;
  }, []);

  return (
    <List>
      {ids.map((id) => (
        <Profiler key={id} id={id} onRender={onRender}>
          <LayerRow id={id}>
            <Counter
              ref={(el) => {
                if (!el) return;
                badges.current.set(id, el);
                return () => {
                  badges.current.delete(id);
                };
              }}
            />
          </LayerRow>
        </Profiler>
      ))}
    </List>
  );
});

export function StressPage() {
  const { replaceLayers } = useLayersController();
  const [size, setSize] = useState(INITIAL_SIZE);

  useEffect(() => {
    replaceLayers(makeLayers(INITIAL_SIZE));
  }, [replaceLayers]);

  // Replace layers and remount the list in the same batch, so every row mounts once
  // with its final data and the counters start from 1.
  const resize = (n: number): void => {
    replaceLayers(makeLayers(n));
    setSize(n);
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>Стресс-тест</h1>
      <Controls>
        Слоёв:{" "}
        {SIZES.map((n) => (
          <button key={n} type="button" disabled={n === size} onClick={() => resize(n)}>
            {n}
          </button>
        ))}
        <Hint>
          Счётчик — сколько раз строка отрендерилась (React Profiler, работает в dev-сборке).
          Переключите любой слой: счётчик растёт только у него.
        </Hint>
      </Controls>
      <StressList key={size} />
    </main>
  );
}
