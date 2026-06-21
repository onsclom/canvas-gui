// Kanban board — drag cards between (and within) columns. Proves the drag-and-
// drop primitive: beginDrag carries the card, dropZone() per column reports the
// drop, and the insertion index is computed from the cursor's y.
import * as ui from "canvas-gui";

type Card = { id: number; text: string; tag: string; color: string };
type Column = { id: string; title: string; cards: Card[] };

let nextId = 1;
function card(text: string, tag: string, color: string): Card {
  return { id: nextId++, text, tag, color };
}

const state = {
  cols: [
    {
      id: "backlog",
      title: "Backlog",
      cards: [
        card("Vendor the library into the app", "chore", "#a78bfa"),
        card("Spec out the settings page", "design", "#f472b6"),
        card("Investigate dropped frames on scroll", "bug", "#f87171"),
        card("Write migration guide", "docs", "#60a5fa"),
      ],
    },
    {
      id: "progress",
      title: "In Progress",
      cards: [
        card("Drag-and-drop primitive", "feat", "#4ade80"),
        card("Virtualized data grid", "feat", "#4ade80"),
      ],
    },
    { id: "review", title: "Review", cards: [card("ui.canvas escape hatch", "feat", "#4ade80")] },
    {
      id: "done",
      title: "Done",
      cards: [
        card("Remove command bus", "chore", "#a78bfa"),
        card("Theme + text presets", "feat", "#4ade80"),
      ],
    },
  ] as Column[],
  // drop intent, applied after the column loop to avoid mutating mid-build
  move: null as { cardId: number; toCol: string; index: number } | null,
};

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  const draggingId =
    ui.isDragging() ? (ui.dragPayload() as { cardId: number }).cardId : -1;
  state.move = null;

  ui.row({ x: 14, y: 16, gap: 10, align: "center" }, () => {
    ui.text("Kanban", "h2");
    ui.text("drag cards between columns — drop where the line shows", "caption");
  });

  ui.row(
    { x: 14, y: 52, width: w - 28, height: h - 70, gap: 12, align: "stretch" },
    () => {
      for (const col of state.cols) column(col, draggingId);
    },
  );

  // floating ghost of the dragged card
  if (draggingId >= 0) {
    const c = findCard(draggingId);
    if (c) {
      ui.col(
        {
          x: ui.mouseX() + 8,
          y: ui.mouseY() + 8,
          width: 200,
          bg: "#1f2937",
          border: c.color,
          radius: 8,
          padding: 10,
          gap: 4,
          align: "stretch",
        },
        () => ui.label(c.text, { wrap: true, width: 180 }),
      );
    }
  }

  // apply a drop
  if (state.move) {
    const { cardId, toCol, index } = state.move;
    const c = findCard(cardId);
    if (c) {
      for (const col of state.cols) col.cards = col.cards.filter((x) => x.id !== cardId);
      const dest = state.cols.find((x) => x.id === toCol)!;
      dest.cards.splice(Math.min(index, dest.cards.length), 0, c);
    }
  }
}

function column(col: Column, draggingId: number) {
  // compute the insertion index from the cursor's y as we lay out the cards
  let insertIndex = col.cards.length;
  let seen = 0;

  const body = ui.col(
    {
      id: `col-${col.id}`,
      width: "grow",
      height: "grow",
      bg: "#0f172a",
      border: "rgba(255,255,255,0.07)",
      radius: 10,
      padding: 10,
      gap: 8,
      align: "stretch",
      scrollable: true,
    },
    () => {
      ui.row({ width: "grow", align: "center", gap: 6 }, () => {
        ui.text(col.title, "h3");
        ui.spacer({ width: "grow" });
        ui.withTextColor("#9ca3af", () =>
          ui.withFont("12px ui-monospace, monospace", () => ui.label(String(col.cards.length))),
        );
      });
      for (let i = 0; i < col.cards.length; i++) {
        const cd = col.cards[i]!;
        const cc = cardWidget(cd, draggingId === cd.id);
        const midY = cc.rect.y + cc.rect.h / 2;
        if (ui.isDragging() && ui.mouseY() > midY) seen = i + 1;
        // start a drag once the press moves a little
        if (cc.dragging && Math.hypot(cc.dragDelta.x, cc.dragDelta.y) > 5) {
          ui.beginDrag({ cardId: cd.id });
        }
      }
    },
  );
  if (ui.isDragging()) insertIndex = seen;

  // highlight + resolve a drop on this column
  const dz = ui.dropZone(body);
  if (dz.over) {
    ui.node({
      x: body.rect.x,
      y: body.rect.y,
      width: body.rect.w,
      height: body.rect.h,
      radius: 10,
      border: "#4ade80",
    });
  }
  if (dz.dropped) {
    const p = dz.payload as { cardId: number };
    state.move = { cardId: p.cardId, toCol: col.id, index: insertIndex };
  }
}

function cardWidget(cd: Card, dragging: boolean): ui.Comm {
  return ui.col(
    {
      id: `card-${cd.id}`,
      width: "grow",
      bg: dragging ? "rgba(31,41,55,0.4)" : "#1f2937",
      border: dragging ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.08)",
      radius: 8,
      padding: 10,
      gap: 6,
      align: "stretch",
      clickable: true,
      cursor: "grab",
    },
    () => {
      ui.withTextColor(dragging ? "#6b7280" : "#e5e7eb", () =>
        ui.label(cd.text, { wrap: true, width: "grow" }),
      );
      ui.row({ gap: 6, align: "center" }, () => {
        ui.node({
          width: "fit",
          padding: { l: 7, r: 7, t: 2, b: 2 },
          radius: 4,
          bg: cd.color,
          text: cd.tag,
          textColor: "#0a0e17",
          font: "bold 10px system-ui, sans-serif",
        });
      });
    },
  );
}

function findCard(id: number): Card | undefined {
  for (const col of state.cols) {
    const c = col.cards.find((x) => x.id === id);
    if (c) return c;
  }
  return undefined;
}
