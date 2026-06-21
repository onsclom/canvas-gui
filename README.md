# canvas-gui

Immediate-mode UI library for HTML canvas with flexbox-style layout.

This repo is a Bun workspace with three packages:

```
packages/
  canvas-gui/   ← the library
  demos/        ← the playground app (every feature, every demo)
  landing/      ← the landing page (built with canvas-gui itself)
```

## Develop

```bash
bun install         # one-time, links workspace packages
bun run demos       # bundles & serves packages/demos
bun run landing     # bundles & serves packages/landing
bun run typecheck   # tsc --noEmit across the whole workspace
```

The demos package is the spec — every widget, animation, and pattern
the library supports has a page in it. Start there if you're learning
the API or extending the library.

## Vendor the library

The library is designed to be **copied** into your own project rather
than `npm install`ed long-term. Read the source, edit it, change the
defaults, add widgets. It's ~1600 lines in a single readable file.

From the repo root:

```bash
bun run vendor /path/to/your-app/src/canvas-gui
```

That copies the contents of `packages/canvas-gui/src/` into the target
directory. Then in your app:

```ts
import * as ui from "./canvas-gui";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
ui.registerInputListeners(canvas);
ui.startLoop(canvas, (ctx, dt) => {
  ui.col({ x: 20, y: 20, gap: 8 }, () => {
    ui.label("hello, world");
    if (ui.button("click me").clicked) console.log("clicked");
  });
});
```

## Files in the library

- `src/ui.ts` — layout solver, draw pass, widgets, focus, animation
- `src/input.ts` — mouse / keyboard / wheel event listeners
- `src/canvas-loop.ts` — RAF loop wiring input, frame lifecycle, and your tick
- `src/index.ts` — public re-exports

See `packages/canvas-gui/README.md` for the per-package overview.

## What's in here

- A working Bun workspace
- The library (`packages/canvas-gui`)
- 14 demos (`packages/demos`), including a literal docs page that documents
  every widget, the [7GUIs](https://eugenkiss.github.io/7guis/) benchmark, a
  performance bench, a physics playground, a generative fractal tree, and a
  small desktop environment (canvasOS)
- A landing page (`packages/landing`)
- This README + a `vendor` script

## Screenshots / visual testing

Demos are deep-linked by URL hash (`#docs`, `#sevenguis`, …). To screenshot or
drive a demo headlessly (used to verify changes):

```bash
bash scripts/chrome.sh          # launch headless Chrome with a CDP port
bun run demos                   # serve the demos
bun scripts/snap.ts sevenguis out.png            # build + screenshot a demo
bun scripts/snap.ts sevenguis out.png --click 161,167   # ...with interaction
bun scripts/snap.ts docs out.png --mobile --touch       # ...as a touch device
```

`snap.ts` builds a fresh bundle, serves it, drives Chrome over CDP, and fails
on page errors. Supports `--click/--drag/--type/--key` and `--touch`.
