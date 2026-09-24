# Project conventions

React 19 + TypeScript + Vite 8, state in `vedro@1.1.0`, map on MapLibre GL, Yarn 4 via corepack.

## Commands

```bash
yarn dev          # dev server
yarn test         # Vitest; controller tests run without DOM
yarn typecheck    # tsc -b
yarn lint         # ESLint, --max-warnings=0
yarn build
```

A git pre-commit hook (husky, committed in `.husky/`, activated by `yarn install` via
`postinstall`) runs ESLint + Prettier on staged files through lint-staged. Don't bypass it.

## Layers and boundaries

| Folder       | Role                                     | Must not                              |
| ------------ | ---------------------------------------- | ------------------------------------- |
| `src/domain` | types only                               | import anything but types             |
| `src/api`    | `LayersApi` contract + mock              | know about the store or React         |
| `src/core`   | controller, event log — plain TS         | import React                          |
| `src/state`  | vedro store instance, subscription hooks | contain business logic                |
| `src/ui`     | panel components                         | write to the store directly           |
| `src/map`    | MapLibre view + bindings                 | be imported anywhere except `MapPage` |
| `src/pages`  | route components, page-local UI state    | —                                     |

`src/map` must stay removable: deleting it plus its import and `<MapView />` in `MapPage` keeps typecheck,
lint and tests green.

## Invariants

- **All store writes go through the controller** — `patch` (one layer) and `replaceLayers`
  (whole set). Components call controller methods, never `store.dispatch`.
- `patch` creates a new `Layer` object only for the changed layer; other references must
  survive. Row-level render bail-out depends on it.
- **`getSnapshot` uses `store.get(key)` only.** `store.get()` without a key returns a new
  object on every call → infinite re-render.
- The store keeps exactly two top-level keys, `byId` and `allIds`. vedro doesn't accept new
  top-level keys after creation and copies the top level on every dispatch.
- A response may be written only if `inflight.get(id) === ac` for its request. Keep both
  race barriers: `abort()` and this identity check.
- `dispose()` is teardown, not reset. Use `replaceLayers` to reset.
- `LayerLoad` is a discriminated union; handle every status and end switches with
  `assertNever`.

## vedro specifics

- Don't use `dispatch(async fn)`: `isAsyncFunction` in `lib/helpers/typeCheck.js` doesn't
  detect async functions, so such a call doesn't update state. Keep async work in the controller.
- Use the hooks in `src/state/hooks.ts` rather than vedro's `useSelector` / `useDispatch`:
  they subscribe per key, which the row-level render bail-out relies on.
- `import Vedro from "vedro"` yields `module.exports` under Vite 8, not the class. Construct
  stores only via the normalised import in `src/state/layersStore.ts`; elsewhere use
  `import type`.
- Pass a ready `Vedro` instance to `createVedro`, not an initial state object.

## Mock API

- Deterministic (`seed`), so tests are reproducible.
- Chaos mode: odd request of a layer (counted from `setChaos`) is slow and ignores
  `AbortSignal` — deliberately, to reproduce a stale response. Tests needing
  "no live timers" run with `chaos: false`.

## Code style

- No `any` (lint error). Prefer precise types over casts.
- Comments in English, explaining **why**, never what. Mandatory where code relies on a
  vedro quirk (cite the library file), looks redundant but isn't, is deliberately not
  optimised, or hides a trap for the next editor.
- Match surrounding code; no speculative abstractions.

## Tests

- Controller behaviour: `src/core/*.test.ts`, fake timers, no DOM.
- Render counts: `src/ui/LayerPanel.test.tsx` (jsdom via file docblock).
- A new test should be proven by mutation: break the guarded code, see it fail.
