# Learnings from building demos on canvas-gui

Notes captured while stress-testing the library against real apps (the 7GUIs
benchmark and others). Each entry: what we tried, what was easy/awkward, and
what changed in `ui.ts` as a result.

## 7GUIs (packages/demos/src/demos/sevenguis.ts)

All seven tasks fit comfortably in the immediate-mode model. State is plain
module-level objects mutated during build; no retained tree, no bindings.

What was easy (no library changes):
- **Counter / Temperature / Timer** — trivial. Two-way binding for the
  converter is just "if the returned value changed, recompute the other".
- **CRUD** — a scrollable list of `button`s with selection styling, plus
  three inputs. Splicing the array mid-build is fine in immediate mode.
- **Circle Drawer** — one `clickable` pad node; circles are absolutely
  positioned child nodes. Undo/redo is an app-side snapshot stack. Hit-testing
  circles is app math against `comm.rect`. The library didn't need to know
  anything about "circles".
- **Cells** — an 8×12 grid of `row`/`node`. The formula engine (refs,
  arithmetic, `SUM(range)`) is entirely app code. Click-to-edit swaps a
  display `button` for a `textInput`.

What was awkward → drove these `ui.ts` additions:
- **`disabled`** on any node. The Flight Booker's Book button, the return-date
  field when one-way, and CRUD's Update/Delete with no selection all needed a
  "dimmed + non-interactive" state. Added `disabled?: boolean`: it forces
  `clickable` off (so no hover/active/click and not Tab-focusable) and draws
  the subtree at reduced opacity.
- **`focus(id)` / `blur()` / `isFocused(id)`**. The Cells grid needs to focus
  a specific text input the frame after a cell is clicked (the input doesn't
  exist until then). Programmatic focus has to win over the mouse's
  click-to-focus, so `focus()` records a pending request applied at the end of
  the frame. `isFocused` lets the grid detect blur and collapse the editor
  back to a display cell.

Friction worth noting (not yet addressed):
- No precise click-to-caret for a freshly `focus()`-ed input until the next
  frame (acceptable — the caret lands at 0, the user types immediately).
- A scrollable grid wider than its container relies on the new horizontal
  scroll; works, but there's no "freeze header row" concept (the header
  scrolls with the body here because it's inside the same scroll area).

## Workflow

- `scripts/chrome.sh` launches headless Chrome with a CDP port; `scripts/snap.ts`
  builds the demos, serves the fresh bundle, drives Chrome over CDP (Playwright's
  pipe transport hangs in this environment) and screenshots a demo by hash —
  with `--click`, `--type`, `--key` for interaction tests and page-error
  detection. The dev server's HMR serves a stale bundle through the workspace
  symlink, so `snap.ts` always builds fresh.
- Demos are deep-linked by URL hash (`#sevenguis`), which the picker reads on
  load and writes on switch.
