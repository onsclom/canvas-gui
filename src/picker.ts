import * as ui from "./ui";
import { tick as orbitTick } from "./demos/orbit";
import { tick as layoutTick } from "./demos/layout";
import { tick as wordleTick } from "./demos/wordle";
import { tick as kitchenTick } from "./demos/kitchen";
import { tick as docsTick } from "./demos/docs";
import { tick as melodyTick } from "./demos/melody";

type DemoKey =
  | "docs"
  | "orbit"
  | "layout"
  | "wordle"
  | "kitchen"
  | "melody";

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
};

const keys: DemoKey[] = [
  "docs",
  "orbit",
  "layout",
  "wordle",
  "kitchen",
  "melody",
];
const state = { current: "orbit" as DemoKey };

// Command-buffer pattern (Part 8): builder code emits commands during the build
// phase; the handler runs at the start of the next frame, before any builder code,
// so all state mutations happen at a single, predictable point.
ui.onCommand((name, args) => {
  if (name === "picker.set") state.current = args!["demo"] as DemoKey;
});

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  demos[state.current].tick(ctx, dt);

  ui.row(
    {
      x: 0,
      y: 0,
      width: "grow",
      padding: 8,
      gap: 6,
      bg: "rgba(15,23,42,0.85)",
      align: "center",
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
