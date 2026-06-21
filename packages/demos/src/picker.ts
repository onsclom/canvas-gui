import * as ui from "canvas-gui";
import { tick as orbitTick } from "./demos/orbit";
import { tick as layoutTick } from "./demos/layout";
import { tick as wordleTick } from "./demos/wordle";
import { tick as kitchenTick } from "./demos/kitchen";
import { tick as docsTick } from "./demos/docs";
import { tick as melodyTick } from "./demos/melody";
import { tick as windowsTick } from "./demos/windows";
import { tick as animationsTick } from "./demos/animations";
import { tick as stylesTick } from "./demos/styles";
import { tick as sevenguisTick } from "./demos/sevenguis";
import { tick as perfTick } from "./demos/perf";
import { tick as physicsTick } from "./demos/physics";
import { tick as treesTick } from "./demos/trees";

type DemoKey =
  | "docs"
  | "orbit"
  | "layout"
  | "wordle"
  | "kitchen"
  | "melody"
  | "windows"
  | "anim"
  | "styles"
  | "sevenguis"
  | "perf"
  | "physics"
  | "trees";

const demos: Record<
  DemoKey,
  { name: string; tick: (ctx: CanvasRenderingContext2D, dt: number) => void }
> = {
  docs: { name: "Docs", tick: docsTick },
  orbit: { name: "Orbit", tick: orbitTick },
  layout: { name: "Layout", tick: layoutTick },
  wordle: { name: "Wordle", tick: wordleTick },
  kitchen: { name: "Kitchen", tick: kitchenTick },
  melody: { name: "Melody", tick: melodyTick },
  windows: { name: "Windows", tick: windowsTick },
  anim: { name: "Anim", tick: animationsTick },
  styles: { name: "Styles", tick: stylesTick },
  sevenguis: { name: "7GUIs", tick: sevenguisTick },
  perf: { name: "Perf", tick: perfTick },
  physics: { name: "Physics", tick: physicsTick },
  trees: { name: "Trees", tick: treesTick },
};

const keys: DemoKey[] = [
  "docs",
  "orbit",
  "layout",
  "wordle",
  "kitchen",
  "melody",
  "windows",
  "anim",
  "styles",
  "sevenguis",
  "perf",
  "physics",
  "trees",
];

// deep-linking: the current demo is reflected in the URL hash (#docs, #kitchen,
// …) so you can link straight to one and reloads stay put. Handy for testing.
function demoFromHash(): DemoKey {
  const h = location.hash.replace(/^#/, "") as DemoKey;
  return keys.includes(h) ? h : "orbit";
}
const state = { current: demoFromHash() };
window.addEventListener("hashchange", () => {
  state.current = demoFromHash();
});

// Command-buffer pattern (Part 8): builder code emits commands during the build
// phase; the handler runs at the start of the next frame, before any builder code,
// so all state mutations happen at a single, predictable point.
ui.onCommand((name, args) => {
  if (name === "picker.set") {
    state.current = args!["demo"] as DemoKey;
    if (location.hash !== `#${state.current}`) location.hash = state.current;
  }
});

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  demos[state.current].tick(ctx, dt);

  ui.row(
    {
      id: "picker-bar",
      x: 0,
      y: 0,
      width: "grow",
      padding: 8,
      gap: 6,
      bg: "rgba(15,23,42,0.85)",
      align: "center",
      // scroll the tabs sideways when they overflow (narrow / mobile screens);
      // the grow spacer collapses to 0 when overflowing so scrolling kicks in
      scrollable: true,
    },
    () => {
      ui.label("demo:");
      for (const key of keys) {
        if (key === state.current) {
          ui.toggle(demos[key].name, true, {
            id: `pick-${key}`,
            width: 80,
            radius: 5,
          });
        } else {
          if (
            ui.button(demos[key].name, {
              id: `pick-${key}`,
              width: 80,
              radius: 5,
            }).clicked
          ) {
            ui.cmd("picker.set", { demo: key });
          }
        }
      }
      ui.spacer({ width: "grow" });
      ui.label(`fps ${(1000 / dt).toFixed(0)}`);
    },
  );
}
