# canvas-gui

Immediate-mode UI library for HTML canvas with flexbox-style layout. No DOM,
no virtual DOM, no retained tree. You build the UI from scratch every frame
and the library handles layout, hit-testing, focus, and animation.

## Why it exists

- **No HTML / CSS** — describe the UI in TypeScript with flexbox-style props
  (`row`, `col`, `width: "grow"`, `padding`, `gap`, `justify`, `align`).
- **No retained tree** — every frame is a fresh build, so there's no
  reconciliation, no virtual DOM, no stale event listeners. Conditional UI
  is a regular `if`.
- **Tiny footprint** — the library is a few source files with zero runtime
  dependencies.
- **Meant to be vendored** — copy the `src/` directory into your project and
  edit it. The internals are friendly and short.

## Install

This is a Bun workspace package. From a sibling app inside the same
workspace:

```json
{
  "dependencies": {
    "canvas-gui": "workspace:*"
  }
}
```

```ts
import * as ui from "canvas-gui";

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

## Vendor it

Want to fork the source and tweak it? From the workspace root:

```bash
bun run vendor ./my-app/src/canvas-gui
```

That copies the contents of `packages/canvas-gui/src/` to the target path
so you can hack on it freely.

## The API

The full API is documented inline in the `Docs` demo (`packages/demos`).
Quick tour:

- **Containers**: `row`, `col`, `box`
- **Widgets**: `button`, `toggle`, `slider`, `label`, `spacer`,
  `textInput`, `textArea`, `select`
- **Layout helpers**: `withFont`, `withTextColor`, `withWidth`,
  `withHeight`, `withFocusRing`
- **Floating layers**: `modal`, `window`
- **Animation**: `smooth(current, target, decay)` — framerate-independent
  exponential decay. Buttons depress while held; the caret and focus ring
  animate too.
- **Text editing**: `textInput` / `textArea` have a full caret + selection
  model — Shift to extend, Ctrl for word moves, Ctrl+A/C/X/V, double/triple
  click and drag to select, and horizontal scroll for overflow.
- **Scrolling**: `scrollable: true` clips overflow and scrolls whichever
  axis overflows (vertical wheel, Shift+wheel / trackpad for horizontal).
- **Text selection**: plain labels are selectable like a web page; drag to
  select, Ctrl+C to copy. Toggle with `setTextSelectable(false)`.
- **Command buffer**: `cmd(name, args?)` / `onCommand(handler)` for
  deferred state mutations

## Files

- `src/ui.ts` — layout solver, draw pass, widget primitives, focus, etc.
- `src/input.ts` — DOM event listeners for mouse / keyboard / wheel
- `src/canvas-loop.ts` — RAF loop that wires input, frame lifecycle, and
  user tick together
- `src/index.ts` — public re-exports
