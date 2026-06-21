// The 7GUIs benchmark (https://eugenkiss.github.io/7guis/) built on canvas-gui.
// One scrollable page, one card per task. The point is to stress the library
// against a well-known cross-toolkit benchmark and see what's easy, what's
// awkward, and what the library should grow. Learnings live in LEARNINGS.md.
import * as ui from "canvas-gui";

const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";
const R = 6;

type Person = { name: string; surname: string };

const state = {
  // 1 counter
  count: 0,
  // 2 temperature
  celsius: "",
  fahrenheit: "",
  // 3 flight booker
  flight: "one-way" as "one-way" | "return",
  depart: "27.03.2026",
  ret: "27.03.2026",
  flightMsg: "",
  // 4 timer
  elapsed: 0, // seconds
  duration: 15, // seconds
  // 5 CRUD
  people: [
    { name: "Hans", surname: "Emil" },
    { name: "Max", surname: "Mustermann" },
    { name: "Roman", surname: "Tisch" },
  ] as Person[],
  filter: "",
  selected: 0,
  firstName: "",
  lastName: "",
  // 6 circle drawer
  circles: [] as { x: number; y: number; d: number }[],
  history: [[]] as { x: number; y: number; d: number }[][],
  histAt: 0,
  selectedCircle: -1,
  adjusting: false,
};

function snapshotCircles() {
  // push a deep copy onto the undo history, dropping any redo tail
  const copy = state.circles.map((c) => ({ ...c }));
  state.history = state.history.slice(0, state.histAt + 1);
  state.history.push(copy);
  state.histAt = state.history.length - 1;
}

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  // advance the timer
  state.elapsed = Math.min(state.elapsed + dt / 1000, state.duration);

  ui.col(
    {
      id: "seven-scroll",
      x: 0,
      y: 50,
      width: "grow",
      height: "grow",
      padding: 16,
      gap: 14,
      align: "stretch",
      scrollable: true,
    },
    () => {
      ui.col({ width: "grow", align: "center", gap: 4 }, () => {
        ui.withFont("bold 24px system-ui, sans-serif", () => {
          ui.label("7GUIs");
        });
        ui.withTextColor(MUTED, () => {
          ui.withFont("13px system-ui, sans-serif", () => {
            ui.label(
              "The classic GUI benchmark — counter, converter, booker, timer, CRUD, circles, cells — on canvas-gui.",
            );
          });
        });
      });

      ui.row({ width: "grow", gap: 14, align: "stretch", wrap: false }, () => {
        ui.col({ width: "grow", gap: 14, align: "stretch" }, () => {
          counter();
          temperature();
          flightBooker();
          timer(dt);
        });
        ui.col({ width: "grow", gap: 14, align: "stretch" }, () => {
          crud();
          circleDrawer();
        });
      });

      cells();

      ui.spacer({ height: 12 });
    },
  );
}

function card(title: string, fn: () => void) {
  ui.col(
    {
      width: "grow",
      padding: 16,
      gap: 12,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: 8,
      align: "stretch",
    },
    () => {
      ui.withFont("bold 14px system-ui, sans-serif", () => {
        ui.label(title);
      });
      fn();
    },
  );
}

// ── 1. Counter ───────────────────────────────────────────────────────
function counter() {
  card("Counter", () => {
    ui.row({ gap: 10, align: "center" }, () => {
      ui.node({
        width: 80,
        height: 32,
        bg: CHROME_BG,
        radius: R,
        text: String(state.count),
        textAlign: "center",
      });
      if (ui.button("Count", { id: "sg-count", width: 100, height: 32, radius: R }).clicked) {
        state.count++;
      }
    });
  });
}

// ── 2. Temperature Converter ─────────────────────────────────────────
function temperature() {
  card("Temperature Converter", () => {
    ui.row({ gap: 8, align: "center", width: "grow" }, () => {
      const c = ui.textInput(state.celsius, {
        id: "sg-celsius",
        width: "grow",
        textAlign: "center",
      }).value;
      if (c !== state.celsius) {
        state.celsius = c;
        const n = parseFloat(c);
        if (!Number.isNaN(n)) state.fahrenheit = String(Math.round(n * (9 / 5) + 32));
      }
      ui.withTextColor(MUTED, () => ui.label("°C  =", { width: 36 }));
      const f = ui.textInput(state.fahrenheit, {
        id: "sg-fahrenheit",
        width: "grow",
        textAlign: "center",
      }).value;
      if (f !== state.fahrenheit) {
        state.fahrenheit = f;
        const n = parseFloat(f);
        if (!Number.isNaN(n)) state.celsius = String(Math.round((n - 32) * (5 / 9)));
      }
      ui.withTextColor(MUTED, () => ui.label("°F", { width: 20 }));
    });
  });
}

// ── 3. Flight Booker ─────────────────────────────────────────────────
function parseDate(s: string): number | null {
  // dd.mm.yyyy
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const t = new Date(+y!, +mo! - 1, +d!).getTime();
  return Number.isNaN(t) ? null : t;
}
function flightBooker() {
  card("Flight Booker", () => {
    const isReturn = state.flight === "return";
    state.flight = ui.select(state.flight, ["one-way", "return"] as const, {
      id: "sg-flight",
      width: "grow",
    }).value;

    const d1 = parseDate(state.depart);
    const d2 = parseDate(state.ret);
    const departBad = d1 === null;
    const returnBad = isReturn && d2 === null;

    state.depart = ui.textInput(state.depart, {
      id: "sg-depart",
      width: "grow",
      border: departBad ? "#ef4444" : undefined,
    }).value;
    state.ret = ui.textInput(state.ret, {
      id: "sg-return",
      width: "grow",
      border: returnBad ? "#ef4444" : undefined,
      disabled: !isReturn,
    }).value;

    const canBook =
      d1 !== null && (!isReturn || (d2 !== null && d2 >= d1));
    if (
      ui.button("Book", {
        id: "sg-book",
        width: "grow",
        height: 32,
        radius: R,
        bg: "accent",
        textColor: "#052e16",
        disabled: !canBook,
      }).clicked
    ) {
      state.flightMsg = isReturn
        ? `You booked a return flight, departing ${state.depart}, returning ${state.ret}.`
        : `You booked a one-way flight on ${state.depart}.`;
    }
    if (state.flightMsg) {
      ui.withTextColor("#4ade80", () => {
        ui.withFont("12px system-ui, sans-serif", () => {
          ui.label(state.flightMsg, { wrap: true, width: "grow" });
        });
      });
    }
  });
}

// ── 4. Timer ─────────────────────────────────────────────────────────
function timer(_dt: number) {
  card("Timer", () => {
    const frac = state.duration > 0 ? state.elapsed / state.duration : 1;
    ui.row({ gap: 10, align: "center", width: "grow" }, () => {
      ui.withTextColor(MUTED, () => ui.label("Elapsed", { width: 60 }));
      // gauge
      ui.node({
        width: "grow",
        height: 16,
        bg: CHROME_BG,
        radius: 8,
        fillBar: frac,
      });
    });
    ui.withTextColor(MUTED, () => {
      ui.withFont("12px ui-monospace, monospace", () => {
        ui.label(`${state.elapsed.toFixed(1)}s / ${state.duration.toFixed(0)}s`);
      });
    });
    ui.row({ gap: 10, align: "center", width: "grow" }, () => {
      ui.withTextColor(MUTED, () => ui.label("Duration", { width: 60 }));
      state.duration = ui.slider("", state.duration, 0, 60, {
        id: "sg-duration",
        width: "grow",
        height: 24,
        radius: R,
        precision: 0,
      }).value;
    });
    if (ui.button("Reset", { id: "sg-timer-reset", width: "grow", height: 30, radius: R }).clicked) {
      state.elapsed = 0;
    }
  });
}

// ── 5. CRUD ──────────────────────────────────────────────────────────
function crud() {
  card("CRUD", () => {
    ui.row({ gap: 8, align: "center", width: "grow" }, () => {
      ui.withTextColor(MUTED, () => ui.label("Filter", { width: 64 }));
      state.filter = ui.textInput(state.filter, {
        id: "sg-filter",
        width: "grow",
        placeholder: "surname prefix",
      }).value;
    });

    const prefix = state.filter.toLowerCase();
    const shown = state.people
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.surname.toLowerCase().startsWith(prefix));

    ui.col(
      {
        id: "sg-crud-list",
        width: "grow",
        height: 120,
        bg: CHROME_BG,
        border: CARD_BORDER,
        radius: R,
        padding: 4,
        gap: 2,
        align: "stretch",
        scrollable: true,
      },
      () => {
        for (const { p, i } of shown) {
          const sel = state.selected === i;
          if (
            ui.button(`${p.surname}, ${p.name}`, {
              id: `sg-person-${i}`,
              width: "grow",
              height: 26,
              radius: 4,
              textAlign: "left",
              padding: { l: 8, r: 8, t: 0, b: 0 },
              bg: sel ? "accent" : "rgba(255,255,255,0)",
              textColor: sel ? "#052e16" : undefined,
            }).clicked
          ) {
            state.selected = i;
            state.firstName = p.name;
            state.lastName = p.surname;
          }
        }
      },
    );

    ui.row({ gap: 8, width: "grow" }, () => {
      ui.withTextColor(MUTED, () => ui.label("Name", { width: 64 }));
      state.firstName = ui.textInput(state.firstName, { id: "sg-fn", width: "grow" }).value;
    });
    ui.row({ gap: 8, width: "grow" }, () => {
      ui.withTextColor(MUTED, () => ui.label("Surname", { width: 64 }));
      state.lastName = ui.textInput(state.lastName, { id: "sg-ln", width: "grow" }).value;
    });

    ui.row({ gap: 8, width: "grow" }, () => {
      if (ui.button("Create", { id: "sg-create", width: "grow", height: 30, radius: R }).clicked) {
        if (state.firstName || state.lastName) {
          state.people.push({ name: state.firstName, surname: state.lastName });
          state.selected = state.people.length - 1;
        }
      }
      const has = state.selected >= 0 && state.selected < state.people.length;
      if (
        ui.button("Update", {
          id: "sg-update",
          width: "grow",
          height: 30,
          radius: R,
          disabled: !has,
        }).clicked
      ) {
        state.people[state.selected] = {
          name: state.firstName,
          surname: state.lastName,
        };
      }
      if (
        ui.button("Delete", {
          id: "sg-delete",
          width: "grow",
          height: 30,
          radius: R,
          disabled: !has,
        }).clicked
      ) {
        state.people.splice(state.selected, 1);
        state.selected = Math.min(state.selected, state.people.length - 1);
      }
    });
  });
}

// ── 6. Circle Drawer ─────────────────────────────────────────────────
function circleDrawer() {
  card("Circle Drawer", () => {
    ui.row({ gap: 8, width: "grow" }, () => {
      if (
        ui.button("Undo", {
          id: "sg-undo",
          width: "grow",
          height: 28,
          radius: R,
          disabled: state.histAt <= 0,
        }).clicked
      ) {
        state.histAt = Math.max(0, state.histAt - 1);
        state.circles = state.history[state.histAt]!.map((c) => ({ ...c }));
        state.selectedCircle = -1;
        state.adjusting = false;
      }
      if (
        ui.button("Redo", {
          id: "sg-redo",
          width: "grow",
          height: 28,
          radius: R,
          disabled: state.histAt >= state.history.length - 1,
        }).clicked
      ) {
        state.histAt = Math.min(state.history.length - 1, state.histAt + 1);
        state.circles = state.history[state.histAt]!.map((c) => ({ ...c }));
        state.selectedCircle = -1;
        state.adjusting = false;
      }
    });

    const pad = ui.node({
      id: "sg-circle-pad",
      width: "grow",
      height: 200,
      bg: CHROME_BG,
      border: CARD_BORDER,
      radius: R,
      clickable: true,
      cursor: "crosshair",
      clip: true,
    });

    // hover highlight: nearest circle containing the cursor
    const mx = ui.mouseX();
    const my = ui.mouseY();
    let hoverIdx = -1;
    let hoverDist = Infinity;
    for (let i = 0; i < state.circles.length; i++) {
      const c = state.circles[i]!;
      const dx = mx - (pad.rect.x + c.x);
      const dy = my - (pad.rect.y + c.y);
      const dist = Math.hypot(dx, dy);
      if (dist <= c.d / 2 && dist < hoverDist) {
        hoverDist = dist;
        hoverIdx = i;
      }
    }

    if (pad.clicked && !state.adjusting) {
      if (hoverIdx >= 0) {
        state.selectedCircle = hoverIdx;
      } else {
        // empty space → create a circle at the click point
        state.circles.push({ x: mx - pad.rect.x, y: my - pad.rect.y, d: 40 });
        state.selectedCircle = state.circles.length - 1;
        snapshotCircles();
      }
    }

    // draw circles (absolute, inside the pad)
    for (let i = 0; i < state.circles.length; i++) {
      const c = state.circles[i]!;
      const sel = i === state.selectedCircle;
      const hov = i === hoverIdx;
      ui.node({
        x: pad.rect.x + c.x - c.d / 2,
        y: pad.rect.y + c.y - c.d / 2,
        width: c.d,
        height: c.d,
        radius: c.d / 2,
        bg: sel || hov ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.06)",
        border: sel ? "#4ade80" : "rgba(255,255,255,0.4)",
      });
    }

    // diameter popup for the selected circle
    if (state.selectedCircle >= 0 && state.selectedCircle < state.circles.length) {
      const c = state.circles[state.selectedCircle]!;
      if (
        ui.button(`Adjust diameter (${Math.round(c.d)})`, {
          id: "sg-adjust",
          width: "grow",
          height: 28,
          radius: R,
        }).clicked
      ) {
        state.adjusting = !state.adjusting;
        if (!state.adjusting) snapshotCircles();
      }
      if (state.adjusting) {
        c.d = ui.slider("diameter", c.d, 4, 160, {
          id: "sg-diameter",
          width: "grow",
          height: 26,
          radius: R,
          precision: 0,
        }).value;
      }
    }
  });
}

// ── 7. Cells ─────────────────────────────────────────────────────────
const COLS = 8; // A..H
const ROWS = 12;
const cellData = new Map<string, string>(); // raw text per "A1"
const cellEditing = { key: "" };

function colName(i: number) {
  return String.fromCharCode(65 + i);
}
function cellKey(col: number, row: number) {
  return `${colName(col)}${row + 1}`;
}

// minimal formula eval: numbers, + - * /, parens, cell refs (A1),
// and SUM(A1:B3). Returns a number or NaN. Guards against cycles.
function evalCell(key: string, seen: Set<string>): number {
  const raw = (cellData.get(key) ?? "").trim();
  if (raw === "") return 0;
  if (raw[0] !== "=") {
    const n = Number(raw);
    return Number.isNaN(n) ? NaN : n;
  }
  if (seen.has(key)) return NaN; // cycle
  seen.add(key);
  try {
    return evalExpr(raw.slice(1), seen);
  } catch {
    return NaN;
  } finally {
    seen.delete(key);
  }
}

function evalExpr(expr: string, seen: Set<string>): number {
  // expand SUM(A1:B3) ranges first
  expr = expr.replace(/SUM\(([A-H])(\d+):([A-H])(\d+)\)/gi, (_, c1, r1, c2, r2) => {
    const a = c1.toUpperCase().charCodeAt(0) - 65;
    const b = c2.toUpperCase().charCodeAt(0) - 65;
    let total = 0;
    for (let col = Math.min(a, b); col <= Math.max(a, b); col++) {
      for (let row = Math.min(+r1, +r2); row <= Math.max(+r1, +r2); row++) {
        const v = evalCell(`${colName(col)}${row}`, seen);
        if (!Number.isNaN(v)) total += v;
      }
    }
    return `(${total})`;
  });
  // substitute remaining cell refs with their values
  expr = expr.replace(/([A-H])(\d+)/gi, (_, c, r) => {
    const v = evalCell(`${c.toUpperCase()}${r}`, seen);
    return `(${Number.isNaN(v) ? "NaN" : v})`;
  });
  // tokenize + evaluate a basic arithmetic grammar (no eval())
  return parseArith(expr);
}

// recursive-descent arithmetic: term (('+'|'-') term)*, etc.
function parseArith(s: string): number {
  let i = 0;
  const skip = () => {
    while (i < s.length && s[i] === " ") i++;
  };
  function expr(): number {
    let v = term();
    skip();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
      skip();
    }
    return v;
  }
  function term(): number {
    let v = factor();
    skip();
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i++];
      const r = factor();
      v = op === "*" ? v * r : v / r;
      skip();
    }
    return v;
  }
  function factor(): number {
    skip();
    if (s[i] === "(") {
      i++;
      const v = expr();
      skip();
      if (s[i] === ")") i++;
      return v;
    }
    if (s[i] === "-") {
      i++;
      return -factor();
    }
    const start = i;
    while (i < s.length && /[0-9.eE]/.test(s[i]!)) i++;
    if (s.slice(start, i).startsWith("NaN")) return NaN;
    const n = Number(s.slice(start, i));
    return Number.isNaN(n) ? NaN : n;
  }
  const out = expr();
  return out;
}

function cells() {
  card("Cells", () => {
    ui.withTextColor(MUTED, () => {
      ui.withFont("12px system-ui, sans-serif", () => {
        ui.label(
          "A tiny spreadsheet. Type numbers or formulas like =A1+B2 or =SUM(A1:A5). Click a cell to edit.",
          { wrap: true, width: "grow" },
        );
      });
    });

    ui.col(
      {
        id: "sg-cells-scroll",
        width: "grow",
        height: 300,
        bg: CHROME_BG,
        border: CARD_BORDER,
        radius: R,
        scrollable: true,
        align: "stretch",
      },
      () => {
        // header row
        ui.row({ width: "grow", gap: 0 }, () => {
          ui.node({ width: 36, height: 24, bg: "#111827", text: "", border: CARD_BORDER });
          for (let c = 0; c < COLS; c++) {
            ui.node({
              width: 80,
              height: 24,
              bg: "#111827",
              border: CARD_BORDER,
              text: colName(c),
              textAlign: "center",
              textColor: MUTED,
              font: "bold 11px system-ui, sans-serif",
            });
          }
        });
        for (let r = 0; r < ROWS; r++) {
          ui.row({ width: "grow", gap: 0 }, () => {
            ui.node({
              width: 36,
              height: 24,
              bg: "#111827",
              border: CARD_BORDER,
              text: String(r + 1),
              textAlign: "center",
              textColor: MUTED,
              font: "bold 11px system-ui, sans-serif",
            });
            for (let c = 0; c < COLS; c++) {
              const key = cellKey(c, r);
              const editing = cellEditing.key === key;
              const isFocused = ui.isFocused(`cell-${key}`);
              if (!isFocused && editing) cellEditing.key = ""; // blurred
              if (editing) {
                const v = ui.textInput(cellData.get(key) ?? "", {
                  id: `cell-${key}`,
                  width: 80,
                  height: 24,
                  radius: 0,
                  bg: "#0b0f17",
                  font: "12px ui-monospace, monospace",
                  padding: { l: 4, r: 4, t: 0, b: 0 },
                }).value;
                cellData.set(key, v);
              } else {
                const raw = cellData.get(key) ?? "";
                const display =
                  raw[0] === "="
                    ? (() => {
                        const n = evalCell(key, new Set());
                        return Number.isNaN(n) ? "#ERR" : trimNum(n);
                      })()
                    : raw;
                if (
                  ui.button(display, {
                    id: `cellbtn-${key}`,
                    width: 80,
                    height: 24,
                    radius: 0,
                    bg: "rgba(255,255,255,0.01)",
                    border: CARD_BORDER,
                    textAlign: raw && raw[0] !== "=" && !Number.isNaN(Number(raw)) ? "left" : "left",
                    textColor: display === "#ERR" ? "#ef4444" : undefined,
                    font: "12px ui-monospace, monospace",
                    padding: { l: 4, r: 4, t: 0, b: 0 },
                    press: false,
                  }).clicked
                ) {
                  cellEditing.key = key;
                  ui.focus(`cell-${key}`);
                }
              }
            }
          });
        }
      },
    );
  });
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
