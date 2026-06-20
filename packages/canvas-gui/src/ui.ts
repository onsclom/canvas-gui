import { keysDown, keysJustPressed, keysTyped, mouse } from "./input";

const FONT = "14px system-ui, sans-serif";
const BG = "#374151";
const BG_HOT = "#4b5563";
const BG_ACTIVE = "#6b7280";
const FG = "#f3f4f6";
const ACCENT = "#4ade80";
const ACCENT_HOT = "#86efac";
const ACCENT_FG = "#052e16";
const TRACK = "#0f172a";
const FOCUS_RING = "#4ade80";
const SELECTION_BG = "rgba(74,222,128,0.30)";

const BUTTON_PAD_X = 12;
const BUTTON_PAD_Y = 6;
const SLIDER_FIT_W = 160;
const SLIDER_FIT_H = 24;
const LABEL_H = 16;
const SCROLLBAR_W = 4;
const SCROLLBAR_MARGIN = 4;

const ANIM_DECAY = 20;
const CACHE_STALE_FRAMES = 60;

export type SizeSpec = number | "fit" | "grow";

type Padding = { t: number; r: number; b: number; l: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type Comm = {
  rect: Rect;
  hovering: boolean;
  active: boolean;
  pressed: boolean;
  released: boolean;
  clicked: boolean;
  dragging: boolean;
  dragDelta: { x: number; y: number };
};

export type ToggleComm = Comm & { value: boolean };
export type SliderComm = Comm & { value: number };

// "auto" = neutral palette (BG → BG_HOT → BG_ACTIVE) with hot/active blend
// "accent" = green palette (ACCENT → ACCENT_HOT) with hot blend
// any other string = fixed CSS color, no animation
export type BgSpec = "auto" | "accent" | (string & {});

export type NodeOpts = {
  id?: string;
  width?: SizeSpec;
  height?: SizeSpec;
  x?: number;
  y?: number;
  // layout (meaningful when children are provided)
  dir?: "row" | "col";
  padding?: number | Partial<Padding>;
  gap?: number;
  justify?: "start" | "center" | "end" | "between";
  align?: "start" | "center" | "end" | "stretch";
  scrollable?: boolean;
  // features
  clickable?: boolean;
  bg?: BgSpec;
  border?: string;
  radius?: number;
  text?: string;
  textColor?: string;
  textAlign?: "left" | "center";
  font?: string;
  wrap?: boolean;
  fillBar?: number; // 0..1
  cursor?: string;  // CSS cursor when hovered; defaults to "pointer" for clickable
  caretAt?: number; // draw a blinking text caret at this character index
  zOrder?: number;  // higher = drawn later among deferred-abs entries
  windowRoot?: boolean; // marks the outer col of a window for ownership tracking
  focusRing?: string; // keyboard-focus ring color; "none" hides it. defaults to the accent
  press?: boolean;  // animate a slight depress while held; defaults on for button/toggle
  clip?: boolean;   // clip children to this node's (rounded) rect even when not scrollable
  // text rendering extras — mostly set internally by textInput/textArea
  selStart?: number; // selection highlight start (char index)
  selEnd?: number;   // selection highlight end (char index)
  textScrollX?: number; // horizontal text offset for overflow scrolling
};

export type ContainerOpts = NodeOpts;
export type WidgetOpts = NodeOpts;

type Node = {
  id: string;
  width: SizeSpec;
  height: SizeSpec;
  absX: number;
  absY: number;
  isAbs: boolean;
  dir: "row" | "col";
  padding: Padding;
  gap: number;
  justify: "start" | "center" | "end" | "between";
  align: "start" | "center" | "end" | "stretch";
  scrollable: boolean;
  clickable: boolean;
  bg?: BgSpec;
  border?: string;
  radius: number;
  text?: string;
  textColor?: string;
  textAlign: "left" | "center";
  font: string;
  wrap: boolean;
  wrappedLines?: string[];
  fillBar?: number;
  cursor?: string;
  caretAt?: number;
  zOrder: number;
  windowRoot: boolean;
  focusRing?: string;
  press: boolean;
  clip: boolean;
  // text-input rendering extras (set by textInput/textArea)
  selStart?: number; // selection range start (char index) for highlight
  selEnd?: number;   // selection range end (char index) for highlight
  textScrollX?: number; // horizontal text offset for overflow scrolling
  intrinsicW: number;
  intrinsicH: number;
  children: Node[];
  cx: number;
  cy: number;
  cw: number;
  ch: number;
};

type WidgetState = {
  rect: Rect;
  pressX: number;
  pressY: number;
  // generic snapshot taken at press; used by sliders, scroll thumbs,
  // window drag handles, resize grips — anyone who needs "value at press"
  pressData: { x: number; y: number };
  hotT: number;
  activeT: number;
  focusT: number;
  // smoothed caret x (px, relative to text origin) + last-move timestamp so
  // the caret slides between positions and stays solid right after a move
  caretX: number;
  caretShownAt: number;
  scrollY: number;
  scrollX: number;
  contentH: number;
  contentW: number;
  // floating-window position + size, persisted across frames by id
  winX: number;
  winY: number;
  winW: number;
  winH: number;
  // frame number of the last user interaction (used to raise windows)
  lastInteraction: number;
  // text-input caret position
  caret: number;
  // text-input selection anchor (the fixed end of a selection; caret is the
  // moving end). selection is empty when selAnchor === caret.
  selAnchor: number;
  // horizontal scroll offset for single-line inputs whose text overflows
  inputScrollX: number;
  // multi-click tracking (double = word, triple = all)
  lastClickMs: number;
  clickCount: number;
  // id of the window subtree this widget was drawn under (null = not inside one)
  ownerWindow: string | null;
  lastTouched: number;
};

type CmdHandler = (name: string, args?: Record<string, unknown>) => void;

let ctx: CanvasRenderingContext2D | null = null;
let canvasW = 0;
let canvasH = 0;
let dtSec = 0;
let roots: Node[] = [];
let stack: Node[] = [];
let hot: string | null = null;
let active: string | null = null;
let nextHot: string | null = null;
let nextScrollTarget: string | null = null;
let nextCursor: string | null = null;
let focused: string | null = null;
const focusList: string[] = [];
// during draw pass, tracks which window subtree we're currently inside
// so each widget can record its owning window in s.ownerWindow
let currentDrawWindow: string | null = null;
let frameIdx = 0;
const cache = new Map<string, WidgetState>();
const pendingClicks = new Set<string>();
const pendingPresses = new Set<string>();
const pendingReleases = new Set<string>();
const deferredAbs: Node[] = [];

const textColorStack: string[] = [];
const widthStack: SizeSpec[] = [];
const heightStack: SizeSpec[] = [];
const fontStack: string[] = [];
const focusRingStack: string[] = [];

const cmdQueue: Array<{ name: string; args?: Record<string, unknown> }> = [];
const cmdHandlers: CmdHandler[] = [];

function normPadding(p?: number | Partial<Padding>): Padding {
  if (p == null) return { t: 0, r: 0, b: 0, l: 0 };
  if (typeof p === "number") return { t: p, r: p, b: p, l: p };
  return { t: p.t ?? 0, r: p.r ?? 0, b: p.b ?? 0, l: p.l ?? 0 };
}

function hit(r: Rect) {
  if (!mouse.onCanvas || r.w <= 0 || r.h <= 0) return false;
  return (
    mouse.x >= r.x &&
    mouse.x < r.x + r.w &&
    mouse.y >= r.y &&
    mouse.y < r.y + r.h
  );
}

function rectInside(inner: Rect, outer: Rect) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

function fontHeight(font: string): number {
  const fh = font.match(/(\d+(?:\.\d+)?)px/);
  return fh ? parseFloat(fh[1]!) : LABEL_H;
}

function measureText(text: string, font: string): { w: number; h: number } {
  if (!ctx) return { w: 0, h: LABEL_H };
  ctx.font = font;
  const m = ctx.measureText(text);
  return { w: m.width, h: fontHeight(font) };
}

function wrapText(text: string, maxWidth: number, font: string): string[] {
  if (!ctx || maxWidth <= 0) return [text];
  ctx.font = font;
  const parts = text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const p of parts) {
    if (!p) continue;
    const test = line + p;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line.trimEnd());
      line = p.trimStart();
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines.length > 0 ? lines : [text];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function expDecay(current: number, target: number, decay: number): number {
  return target + (current - target) * Math.exp(-decay * dtSec);
}

// Public framerate-independent smoothing. `current` approaches `target`
// exponentially; higher `decay` settles faster. Uses the current frame's dt.
export function smooth(current: number, target: number, decay = 12): number {
  return expDecay(current, target, decay);
}

// Live mouse position in canvas (CSS) pixels — handy for custom drawing.
export function mouseX(): number {
  return mouse.x;
}
export function mouseY(): number {
  return mouse.y;
}

function parseColor(s: string): [number, number, number] {
  if (s[0] === "#") {
    return [
      parseInt(s.slice(1, 3), 16),
      parseInt(s.slice(3, 5), 16),
      parseInt(s.slice(5, 7), 16),
    ];
  }
  const m = s.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (m) return [+m[1]!, +m[2]!, +m[3]!];
  return [0, 0, 0];
}
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
}

function getState(id: string): WidgetState {
  let s = cache.get(id);
  if (!s) {
    s = {
      rect: { x: 0, y: 0, w: 0, h: 0 },
      pressX: 0,
      pressY: 0,
      pressData: { x: 0, y: 0 },
      hotT: 0,
      activeT: 0,
      focusT: 0,
      caretX: -1,
      caretShownAt: 0,
      scrollY: 0,
      scrollX: 0,
      contentH: 0,
      contentW: 0,
      winX: 0,
      winY: 0,
      winW: 0,
      winH: 0,
      lastInteraction: 0,
      caret: 0,
      selAnchor: 0,
      inputScrollX: 0,
      lastClickMs: 0,
      clickCount: 0,
      ownerWindow: null,
      lastTouched: frameIdx,
    };
    cache.set(id, s);
  }
  return s;
}

function top<T>(s: T[]): T | undefined {
  return s[s.length - 1];
}

const EMPTY_COMM: Comm = Object.freeze({
  rect: Object.freeze({ x: 0, y: 0, w: 0, h: 0 }),
  hovering: false,
  active: false,
  pressed: false,
  released: false,
  clicked: false,
  dragging: false,
  dragDelta: Object.freeze({ x: 0, y: 0 }),
}) as unknown as Comm;

function widgetComm(id: string): Comm {
  const s = getState(id);
  s.lastTouched = frameIdx;
  const clicked = pendingClicks.has(id);
  if (clicked) pendingClicks.delete(id);
  const pressed = pendingPresses.has(id);
  if (pressed) pendingPresses.delete(id);
  const released = pendingReleases.has(id);
  if (released) pendingReleases.delete(id);
  const isActive = active === id;
  return {
    rect: s.rect,
    hovering: hot === id,
    active: isActive,
    pressed,
    released,
    clicked,
    dragging: isActive && mouse.leftClickDown,
    dragDelta: { x: mouse.x - s.pressX, y: mouse.y - s.pressY },
  };
}

// === lifecycle ===

export function frameStart(c: CanvasRenderingContext2D, deltaMs: number) {
  if (cmdQueue.length > 0) {
    const queue = cmdQueue.slice();
    cmdQueue.length = 0;
    for (const q of queue) for (const h of cmdHandlers) h(q.name, q.args);
  }
  ctx = c;
  canvasW = c.canvas.width / devicePixelRatio;
  canvasH = c.canvas.height / devicePixelRatio;
  dtSec = Math.min(deltaMs, 100) / 1000;
  roots = [];
  stack = [];
  frameIdx++;
  c.font = FONT;
  c.textBaseline = "middle";
}

export function frameEnd() {
  if (!ctx) return;
  nextHot = null;
  nextScrollTarget = null;
  nextCursor = null;
  focusList.length = 0;
  deferredAbs.length = 0;

  // phase 1: solve + draw all in-flow roots; abs roots get deferred to the
  // top of the z-stack so they aren't clipped by ancestors
  for (const r of roots) {
    solveRoot(r);
    if (r.isAbs) deferredAbs.push(r);
    else drawNode(r, 0);
  }
  // phase 2: deferred abs nodes (incl. ones discovered during phase 1).
  // Sort by zOrder so higher-z windows (the most recently interacted) sit
  // on top of others. Stable sort preserves insertion order for ties.
  deferredAbs.sort((a, b) => a.zOrder - b.zOrder);
  let i = 0;
  while (i < deferredAbs.length) {
    drawNode(deferredAbs[i++]!, 0);
  }

  hot = nextHot;

  // keyboard navigation
  if (keysJustPressed.has("Tab") && focusList.length > 0) {
    const back = keysDown.has("Shift");
    const idx = focused ? focusList.indexOf(focused) : -1;
    let next: number;
    if (idx === -1) {
      next = back ? focusList.length - 1 : 0;
    } else {
      next = back
        ? (idx - 1 + focusList.length) % focusList.length
        : (idx + 1) % focusList.length;
    }
    focused = focusList[next]!;
  }
  if (keysJustPressed.has("Escape")) {
    focused = null;
    openSelect = null;
  }
  // close open select when user clicks anything that isn't it or one of its options
  if (mouse.justLeftClicked && openSelect !== null) {
    const openId = openSelect as string;
    const h = hot as string | null;
    const hitInside =
      h === openId || (h !== null && h.indexOf(openId + "#opt-") === 0);
    if (!hitInside) openSelect = null;
  }
  // Enter activates the focused widget (text inputs handle Enter themselves
  // and either insert \n or blur — that's fine, the focus is already gone
  // by the time we get here, so we'll just inject a click for whatever
  // remains focused).
  if (keysJustPressed.has("Enter") && focused && !focused.includes("#")) {
    pendingClicks.add(focused);
  }
  // a real mouse click moves focus too
  if (mouse.justLeftClicked) {
    focused = hot;
  }

  // wheel handling — applies to topmost scrollable under cursor
  if (nextScrollTarget && mouse.wheelDelta !== 0) {
    const s = getState(nextScrollTarget);
    const maxScroll = Math.max(0, s.contentH - s.rect.h);
    s.scrollY = clamp(s.scrollY + mouse.wheelDelta, 0, maxScroll);
  }

  // press / release event queueing
  if (mouse.justLeftClicked && hot !== null && active === null) {
    const id: string = hot;
    active = id;
    const s = getState(id);
    s.pressX = mouse.x;
    s.pressY = mouse.y;
    // generic press snapshots — anything that needs "container value at press"
    // looks itself up via a suffix convention
    if (id.endsWith("#thumb")) {
      const cs = cache.get(id.slice(0, -"#thumb".length));
      if (cs) s.pressData = { x: cs.scrollY, y: 0 };
    } else if (id.endsWith("#drag")) {
      const ws = cache.get(id.slice(0, -"#drag".length));
      if (ws) s.pressData = { x: ws.winX, y: ws.winY };
    } else if (id.endsWith("#resize")) {
      const ws = cache.get(id.slice(0, -"#resize".length));
      if (ws) s.pressData = { x: ws.winW, y: ws.winH };
    }
    pendingPresses.add(id);
  }
  if (mouse.justLeftReleased && active !== null) {
    pendingReleases.add(active);
    const s = getState(active);
    if (hit(s.rect)) pendingClicks.add(active);
  }
  if (!mouse.leftClickDown) active = null;

  for (const [id, s] of cache) {
    if (s.lastTouched < frameIdx - CACHE_STALE_FRAMES) cache.delete(id);
  }
  // sync the DOM cursor to the topmost interactable widget under the cursor
  const targetCursor = nextCursor ?? "default";
  if (ctx.canvas.style.cursor !== targetCursor) {
    ctx.canvas.style.cursor = targetCursor;
  }
  ctx = null;
}

// === node primitive ===

function makeNode(opts: NodeOpts): Node {
  const hasXY = opts.x !== undefined || opts.y !== undefined;
  const font = opts.font ?? top(fontStack) ?? FONT;
  let intrinsicW = 0;
  let intrinsicH = 0;
  if (opts.fillBar !== undefined) {
    intrinsicW = SLIDER_FIT_W;
    intrinsicH = SLIDER_FIT_H;
    if (opts.text !== undefined) {
      const m = measureText(opts.text, font);
      intrinsicW = Math.max(intrinsicW, m.w + BUTTON_PAD_X * 2);
    }
  } else if (opts.text !== undefined) {
    const m = measureText(opts.text, font);
    const padded = opts.clickable === true || opts.bg !== undefined;
    intrinsicW = padded ? m.w + BUTTON_PAD_X * 2 : m.w;
    intrinsicH = padded ? m.h + BUTTON_PAD_Y * 2 : m.h;
  }

  return {
    id: opts.id ?? "",
    width: opts.width ?? top(widthStack) ?? "fit",
    height: opts.height ?? top(heightStack) ?? "fit",
    absX: opts.x ?? 0,
    absY: opts.y ?? 0,
    isAbs: hasXY,
    dir: opts.dir ?? "col",
    padding: normPadding(opts.padding),
    gap: opts.gap ?? 0,
    justify: opts.justify ?? "start",
    align: opts.align ?? "start",
    scrollable: !!opts.scrollable,
    clickable: !!opts.clickable,
    bg: opts.bg,
    border: opts.border,
    radius: opts.radius ?? 0,
    text: opts.text,
    textColor: opts.textColor ?? top(textColorStack),
    textAlign: opts.textAlign ?? "left",
    font,
    wrap: !!opts.wrap,
    fillBar: opts.fillBar,
    cursor: opts.cursor ?? (opts.clickable ? "pointer" : undefined),
    caretAt: opts.caretAt,
    zOrder: opts.zOrder ?? 0,
    windowRoot: !!opts.windowRoot,
    focusRing: opts.focusRing ?? top(focusRingStack),
    press: opts.press ?? false,
    clip: !!opts.clip,
    selStart: opts.selStart,
    selEnd: opts.selEnd,
    textScrollX: opts.textScrollX,
    intrinsicW,
    intrinsicH,
    children: [],
    cx: 0,
    cy: 0,
    cw: 0,
    ch: 0,
  };
}

function attachToParent(n: Node) {
  if (stack.length > 0) {
    stack[stack.length - 1]!.children.push(n);
  } else {
    if (!n.isAbs) {
      n.absX = 0;
      n.absY = 0;
      n.isAbs = true;
    }
    roots.push(n);
  }
}

export function node(opts: NodeOpts, children?: () => void): Comm {
  const n = makeNode(opts);
  attachToParent(n);
  if (children) {
    stack.push(n);
    children();
    stack.pop();
  }
  if (!n.id) return EMPTY_COMM;
  return widgetComm(n.id);
}

export function row(opts: NodeOpts, fn: () => void): Comm {
  return node({ ...opts, dir: "row" }, fn);
}
export function col(opts: NodeOpts, fn: () => void): Comm {
  return node({ ...opts, dir: "col" }, fn);
}

// Single-line text input. Click to focus, type. Full caret + selection model:
// arrows / Home / End move; Shift extends; Ctrl moves/deletes by word; Ctrl+A
// selects all; Ctrl+C/X/V copy/cut/paste via the system clipboard. Double-click
// selects a word, triple-click selects all; click-drag selects a range. Long
// text scrolls horizontally to keep the caret visible. Enter/Escape blur.
export type TextInputComm = Comm & { value: string };

// async clipboard paste lands here keyed by input id; consumed next frame
const pendingPaste = new Map<string, string>();

function selRange(s: WidgetState): [number, number] {
  return s.caret <= s.selAnchor
    ? [s.caret, s.selAnchor]
    : [s.selAnchor, s.caret];
}
function hasSel(s: WidgetState): boolean {
  return s.caret !== s.selAnchor;
}
function deleteSel(text: string, s: WidgetState): string {
  const [a, b] = selRange(s);
  s.caret = a;
  s.selAnchor = a;
  return text.slice(0, a) + text.slice(b);
}

// map a local x (px from the text origin) to the nearest caret index
function caretFromX(text: string, font: string, localX: number): number {
  if (!ctx) return text.length;
  ctx.font = font;
  for (let i = 0; i <= text.length; i++) {
    const w = ctx.measureText(text.slice(0, i)).width;
    if (w >= localX) {
      const prevW = i > 0 ? ctx.measureText(text.slice(0, i - 1)).width : 0;
      return Math.abs(w - localX) < Math.abs(localX - prevW) ? i : i - 1;
    }
  }
  return text.length;
}

// shared editing core for textInput (multiline=false) and textArea (true).
// Mutates s.caret / s.selAnchor and returns the new text.
function editText(
  text: string,
  s: WidgetState,
  id: string,
  multiline: boolean,
): string {
  let next = text;
  const ctrl = keysDown.has("Control");
  const shift = keysDown.has("Shift");

  // consume a paste queued by a previous frame's Ctrl+V
  const pasted = pendingPaste.get(id);
  if (pasted !== undefined) {
    pendingPaste.delete(id);
    if (hasSel(s)) next = deleteSel(next, s);
    const ins = multiline ? pasted : pasted.replace(/[\r\n]+/g, " ");
    next = next.slice(0, s.caret) + ins + next.slice(s.caret);
    s.caret += ins.length;
    s.selAnchor = s.caret;
  }

  for (const k of keysTyped) {
    if (k === "Control" || k === "Shift" || k === "Alt" || k === "Meta") {
      continue;
    }

    // clipboard
    if (ctrl && (k === "c" || k === "C")) {
      if (hasSel(s)) {
        const [a, b] = selRange(s);
        void navigator.clipboard?.writeText(next.slice(a, b));
      }
      continue;
    }
    if (ctrl && (k === "x" || k === "X")) {
      if (hasSel(s)) {
        const [a, b] = selRange(s);
        void navigator.clipboard?.writeText(next.slice(a, b));
        next = deleteSel(next, s);
      }
      continue;
    }
    if (ctrl && (k === "v" || k === "V")) {
      void navigator.clipboard?.readText().then((t) => {
        if (t) pendingPaste.set(id, t);
      });
      continue;
    }
    if (ctrl && (k === "a" || k === "A")) {
      s.selAnchor = 0;
      s.caret = next.length;
      continue;
    }

    if (k === "Backspace") {
      if (hasSel(s)) next = deleteSel(next, s);
      else if (ctrl) {
        const wb = wordBoundaryBack(next, s.caret);
        next = next.slice(0, wb) + next.slice(s.caret);
        s.caret = wb;
      } else if (s.caret > 0) {
        next = next.slice(0, s.caret - 1) + next.slice(s.caret);
        s.caret--;
      }
      s.selAnchor = s.caret;
    } else if (k === "Delete") {
      if (hasSel(s)) next = deleteSel(next, s);
      else if (ctrl) {
        const wf = wordBoundaryForward(next, s.caret);
        next = next.slice(0, s.caret) + next.slice(wf);
      } else if (s.caret < next.length) {
        next = next.slice(0, s.caret) + next.slice(s.caret + 1);
      }
      s.selAnchor = s.caret;
    } else if (k === "ArrowLeft") {
      if (!shift && hasSel(s)) s.caret = selRange(s)[0];
      else
        s.caret = ctrl
          ? wordBoundaryBack(next, s.caret)
          : Math.max(0, s.caret - 1);
      if (!shift) s.selAnchor = s.caret;
    } else if (k === "ArrowRight") {
      if (!shift && hasSel(s)) s.caret = selRange(s)[1];
      else
        s.caret = ctrl
          ? wordBoundaryForward(next, s.caret)
          : Math.min(next.length, s.caret + 1);
      if (!shift) s.selAnchor = s.caret;
    } else if (k === "Home") {
      s.caret = multiline
        ? lineColToIndex(next, caretLineCol(next, s.caret).line, 0)
        : 0;
      if (!shift) s.selAnchor = s.caret;
    } else if (k === "End") {
      if (multiline) {
        const lc = caretLineCol(next, s.caret);
        const len = next.split("\n")[lc.line]?.length ?? 0;
        s.caret = lineColToIndex(next, lc.line, len);
      } else {
        s.caret = next.length;
      }
      if (!shift) s.selAnchor = s.caret;
    } else if (multiline && k === "ArrowUp") {
      const lc = caretLineCol(next, s.caret);
      s.caret = lc.line > 0 ? lineColToIndex(next, lc.line - 1, lc.col) : 0;
      if (!shift) s.selAnchor = s.caret;
    } else if (multiline && k === "ArrowDown") {
      const lc = caretLineCol(next, s.caret);
      const lines = next.split("\n");
      s.caret =
        lc.line < lines.length - 1
          ? lineColToIndex(next, lc.line + 1, lc.col)
          : next.length;
      if (!shift) s.selAnchor = s.caret;
    } else if (k === "Enter") {
      if (multiline) {
        if (hasSel(s)) next = deleteSel(next, s);
        next = next.slice(0, s.caret) + "\n" + next.slice(s.caret);
        s.caret++;
        s.selAnchor = s.caret;
      } else {
        focused = null;
      }
    } else if (k === "Escape") {
      focused = null;
    } else if (k.length === 1 && !ctrl) {
      if (hasSel(s)) next = deleteSel(next, s);
      next = next.slice(0, s.caret) + k + next.slice(s.caret);
      s.caret++;
      s.selAnchor = s.caret;
    }
    s.caret = clamp(s.caret, 0, next.length);
    s.selAnchor = clamp(s.selAnchor, 0, next.length);
  }
  return next;
}

// place the caret/selection from a click (isClick) or a drag on an input.
function inputMouse(
  next: string,
  s: WidgetState,
  font: string,
  padL: number,
  isClick: boolean,
) {
  const localX = mouse.x - (s.rect.x + padL) + s.inputScrollX;
  const idx = caretFromX(next, font, localX);
  if (!isClick) {
    s.caret = idx; // drag-extend: move the caret, keep the anchor
    return;
  }
  const now = performance.now();
  s.clickCount = now - s.lastClickMs < 400 ? s.clickCount + 1 : 1;
  s.lastClickMs = now;
  if (keysDown.has("Shift")) {
    s.caret = idx; // shift-click extends the existing selection
  } else if (s.clickCount >= 3) {
    s.selAnchor = 0;
    s.caret = next.length;
  } else if (s.clickCount === 2) {
    s.selAnchor = wordBoundaryBack(next, Math.min(idx + 1, next.length));
    s.caret = wordBoundaryForward(next, idx);
  } else {
    s.caret = idx;
    s.selAnchor = idx;
  }
}

export function textInput(
  value: string,
  opts: NodeOpts & { placeholder?: string } = {},
): TextInputComm {
  const id = opts.id ?? "text-input";
  const s = getState(id);
  const isFocused = focused === id;
  const font = opts.font ?? top(fontStack) ?? FONT;
  const pad = normPadding(opts.padding ?? { l: 10, r: 10, t: 7, b: 7 });

  let next = isFocused ? editText(value, s, id, false) : value;

  // mouse: focus/blur + caret placement + drag/multi-click selection
  if (mouse.justLeftClicked) {
    if (hot === id) {
      focused = id;
      inputMouse(next, s, font, pad.l, true);
    } else if (isFocused) {
      focused = null;
    }
  } else if (active === id && mouse.leftClickDown && isFocused) {
    inputMouse(next, s, font, pad.l, false);
  }

  const empty = next.length === 0;
  const showPlaceholder = empty && !!opts.placeholder;
  const display = empty ? (opts.placeholder ?? "") : next;
  const textColor = empty ? "#6b7280" : opts.textColor;

  // horizontal scroll so the caret stays visible inside the field (only while
  // focused; an unfocused field shows its text from the start)
  if (ctx && isFocused && !showPlaceholder) {
    ctx.font = font;
    const caretPx = ctx.measureText(next.slice(0, s.caret)).width;
    const innerW = s.rect.w - pad.l - pad.r;
    if (innerW > 0) {
      if (caretPx - s.inputScrollX > innerW) s.inputScrollX = caretPx - innerW;
      if (caretPx - s.inputScrollX < 0) s.inputScrollX = caretPx;
      const totalW = ctx.measureText(next).width;
      s.inputScrollX = clamp(s.inputScrollX, 0, Math.max(0, totalW - innerW));
    }
  } else {
    s.inputScrollX = 0;
  }

  const [sa, sb] = selRange(s);
  const c = node({
    padding: { l: 10, r: 10, t: 7, b: 7 },
    height: 32,
    ...opts,
    id,
    clickable: true,
    cursor: opts.cursor ?? "text",
    bg: opts.bg ?? "#0b0f17",
    border: opts.border ?? (isFocused ? "#4ade80" : "#374151"),
    radius: opts.radius ?? 5,
    text: display,
    textColor,
    textAlign: opts.textAlign ?? "left",
    font,
    caretAt: isFocused && !showPlaceholder ? s.caret : undefined,
    textScrollX: showPlaceholder ? undefined : s.inputScrollX,
    selStart: isFocused && !showPlaceholder && sa !== sb ? sa : undefined,
    selEnd: isFocused && !showPlaceholder && sa !== sb ? sb : undefined,
  });

  return { ...c, value: next };
}

// Select / dropdown. Returns the selected option. Click the trigger to
// open the menu; clicking an option selects + closes; Escape or any click
// outside also closes.
let openSelect: string | null = null;

export type SelectComm<T extends string> = Comm & { value: T };

export function select<T extends string>(
  value: T,
  options: readonly T[],
  opts: NodeOpts = {},
): SelectComm<T> {
  const id = opts.id ?? "select";
  const isOpen = openSelect === id;

  // trigger — a horizontal row with the value on the left and a chevron
  // on the right, separated by a grow spacer
  const trigger = row(
    {
      height: 32,
      ...opts,
      id,
      clickable: true,
      bg: opts.bg ?? "auto",
      border: opts.border,
      radius: opts.radius ?? 5,
      padding:
        typeof opts.padding === "object"
          ? opts.padding
          : { l: 12, r: 10, t: 0, b: 0 },
      align: "center",
      gap: 8,
    },
    () => {
      const empty = !value;
      withTextColor(empty ? "#9ca3af" : (opts.textColor ?? FG), () => {
        label(empty ? "Select…" : value);
      });
      spacer({ width: "grow" });
      withTextColor("#9ca3af", () => {
        withFont("11px system-ui, sans-serif", () => {
          label(isOpen ? "▴" : "▾");
        });
      });
    },
  );
  if (trigger.clicked) {
    openSelect = isOpen ? null : id;
  }

  let chosen = value;
  if (isOpen) {
    const r = trigger.rect;
    const itemH = 32;
    col(
      {
        x: r.x,
        y: r.y + r.h + 4,
        width: r.w,
        bg: "#0b0f17",
        border: "rgba(255,255,255,0.18)",
        radius: 6,
        padding: 4,
        gap: 2,
        align: "stretch",
      },
      () => {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i]!;
          const isCurrent = opt === value;
          const c = button(opt, {
            id: `${id}#opt-${i}`,
            width: "grow",
            height: itemH,
            radius: 4,
            textAlign: "left",
            padding: { l: 12, r: 12, t: 0, b: 0 },
            bg: isCurrent ? "accent" : "rgba(255,255,255,0)",
            textColor: isCurrent ? "#052e16" : undefined,
          });
          if (c.clicked) {
            chosen = opt;
            openSelect = null;
          }
        }
      },
    );
  }

  return { ...trigger, value: chosen };
}

// Multi-line text input. Enter inserts a newline. Up/Down move the caret
// between lines preserving column. Shares the full editing model (selection,
// word nav, clipboard, Ctrl+A) with textInput; selection is highlighted per
// line. Caret rendering uses a per-line label with caretAt.
export function textArea(
  value: string,
  opts: NodeOpts & { placeholder?: string } = {},
): TextInputComm {
  const id = opts.id ?? "text-area";
  const s = getState(id);
  const isFocused = focused === id;
  const font = opts.font ?? top(fontStack) ?? FONT;

  const next = isFocused ? editText(value, s, id, true) : value;

  const lines = next.split("\n");
  const lc = caretLineCol(next, s.caret);
  const empty = next.length === 0;
  const [sa, sb] = selRange(s);
  const showSel = isFocused && sa !== sb;

  const c = col(
    {
      padding: { l: 10, r: 10, t: 7, b: 7 },
      gap: 1,
      ...opts,
      id,
      clickable: true,
      cursor: opts.cursor ?? "text",
      bg: opts.bg ?? "#0b0f17",
      border: opts.border ?? (isFocused ? "#4ade80" : "#374151"),
      radius: opts.radius ?? 5,
      align: "stretch",
      clip: true,
    },
    () => {
      if (empty && opts.placeholder) {
        node({
          text: opts.placeholder,
          textColor: "#6b7280",
          font,
        });
      } else {
        let lineStart = 0;
        for (let i = 0; i < lines.length; i++) {
          const len = lines[i]!.length;
          // intersect the global selection with this line's char range
          let selStart: number | undefined;
          let selEnd: number | undefined;
          if (showSel) {
            const lo = Math.max(sa, lineStart);
            const hi = Math.min(sb, lineStart + len);
            if (hi > lo) {
              selStart = lo - lineStart;
              selEnd = hi - lineStart;
            }
          }
          node({
            width: "grow",
            text: lines[i] === "" ? " " : lines[i]!,
            textColor: opts.textColor,
            font,
            caretAt: isFocused && i === lc.line ? lc.col : undefined,
            selStart,
            selEnd,
          });
          lineStart += len + 1; // +1 for the newline
        }
      }
    },
  );

  // mouse: focus/blur (precise caret placement for multi-line is future work)
  if (mouse.justLeftClicked) {
    if (hot === id) focused = id;
    else if (isFocused) focused = null;
  }

  return { ...c, value: next };
}

// word-boundary helpers — skip non-word chars then word chars, like editors do
function wordBoundaryBack(text: string, idx: number): number {
  while (idx > 0 && /\s/.test(text[idx - 1]!)) idx--;
  while (idx > 0 && !/\s/.test(text[idx - 1]!)) idx--;
  return idx;
}
function wordBoundaryForward(text: string, idx: number): number {
  while (idx < text.length && !/\s/.test(text[idx]!)) idx++;
  while (idx < text.length && /\s/.test(text[idx]!)) idx++;
  return idx;
}

function caretLineCol(
  text: string,
  idx: number,
): { line: number; col: number } {
  let line = 0;
  let col = 0;
  for (let i = 0; i < idx; i++) {
    if (text[i] === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return { line, col };
}

function lineColToIndex(text: string, line: number, col: number): number {
  const lines = text.split("\n");
  let idx = 0;
  for (let i = 0; i < line && i < lines.length; i++) {
    idx += lines[i]!.length + 1;
  }
  const targetLen = lines[line]?.length ?? 0;
  idx += Math.min(col, targetLen);
  return idx;
}

// Floating window — draggable title bar + resizable bottom-right corner.
// Position and size are persisted in the cache by id.
export type WindowOpts = NodeOpts & {
  title?: string;
  defaultX?: number;
  defaultY?: number;
  defaultW?: number;
  defaultH?: number;
  minW?: number;
  minH?: number;
};

export function window(opts: WindowOpts, fn: () => void): Comm {
  const id = opts.id ?? "window";
  const s = getState(id);
  if (s.winW === 0 && s.winH === 0) {
    s.winX = opts.defaultX ?? 80;
    s.winY = opts.defaultY ?? 80;
    s.winW = opts.defaultW ?? 320;
    s.winH = opts.defaultH ?? 240;
  }
  const minW = opts.minW ?? 200;
  const minH = opts.minH ?? 120;

  const dragId = `${id}#drag`;
  const resizeId = `${id}#resize`;

  // live drag — title bar held + mouse moved
  const ds = cache.get(dragId);
  if (ds && active === dragId && mouse.leftClickDown) {
    s.winX = ds.pressData.x + (mouse.x - ds.pressX);
    s.winY = ds.pressData.y + (mouse.y - ds.pressY);
  }
  // live resize — corner held + mouse moved
  const rs = cache.get(resizeId);
  if (rs && active === resizeId && mouse.leftClickDown) {
    s.winW = Math.max(minW, rs.pressData.x + (mouse.x - rs.pressX));
    s.winH = Math.max(minH, rs.pressData.y + (mouse.y - rs.pressY));
  }
  // clamp inside canvas
  s.winX = clamp(s.winX, 0, Math.max(0, canvasW - s.winW));
  s.winY = clamp(s.winY, 0, Math.max(0, canvasH - s.winH));

  // raise this window if last-frame's topmost widget under the cursor is
  // one of ours. `hot` is set at the end of the previous frame's draw, so
  // it already reflects z-order. Ownership is exact (not geometric): each
  // widget records the windowRoot it was drawn inside, so an overlapping
  // widget in the wrong window never qualifies.
  if (mouse.justLeftClicked && hot !== null) {
    const hotState = cache.get(hot);
    if (hotState && hotState.ownerWindow === id) {
      s.lastInteraction = frameIdx;
    }
  }

  return col(
    {
      x: s.winX,
      y: s.winY,
      width: s.winW,
      height: s.winH,
      align: "stretch",
      ...opts,
      id,
      bg: opts.bg ?? "#1f2937",
      border: opts.border ?? "rgba(255,255,255,0.18)",
      radius: opts.radius ?? 0,
      zOrder: s.lastInteraction,
      windowRoot: true,
    },
    () => {
      // title bar (drag handle) — no radius, full-width
      row(
        {
          id: dragId,
          width: "grow",
          height: 26,
          padding: { l: 10, r: 10 },
          gap: 8,
          bg: "#2a3441",
          align: "center",
          clickable: true,
          cursor: active === dragId ? "grabbing" : "grab",
        },
        () => {
          withFont("bold 12px system-ui, sans-serif", () => {
            label(opts.title ?? "Window");
          });
        },
      );
      // body
      col(
        {
          width: "grow",
          height: "grow",
          padding: 12,
          gap: 8,
          align: "stretch",
        },
        fn,
      );
      // resize footer — in-flow at the bottom so z-order matches the window
      row(
        {
          width: "grow",
          height: 14,
          padding: { r: 3, b: 1 },
          align: "end",
          justify: "end",
        },
        () => {
          button("⇲", {
            id: resizeId,
            width: 12,
            height: 12,
            bg: "transparent",
            textColor: "rgba(255,255,255,0.4)",
            font: "11px ui-monospace, monospace",
            cursor: "nwse-resize",
            radius: 0,
            padding: 0,
          });
        },
      );
    },
  );
}

// Modal — full-canvas backdrop that centers its content on top of everything.
// `Comm.clicked` is true when the backdrop (not the content) is clicked,
// so `if (modal.clicked) close()` gives you dismiss-on-backdrop-click.
export function modal(opts: NodeOpts, fn: () => void): Comm {
  return col(
    {
      x: 0,
      y: 0,
      width: "grow",
      height: "grow",
      align: "center",
      justify: "center",
      bg: "rgba(0,0,0,0.55)",
      clickable: true,
      cursor: "default",
      ...opts,
      id: opts.id ?? "modal",
    },
    fn,
  );
}

// === widgets ===

export function spacer(opts: NodeOpts = {}): void {
  node(opts);
}

export function label(text: string, opts: NodeOpts = {}): void {
  node({ ...opts, text, textAlign: opts.textAlign ?? "left" });
}

export function button(labelText: string, opts: NodeOpts = {}): Comm {
  return node({
    ...opts,
    id: opts.id ?? labelText,
    clickable: true,
    bg: opts.bg ?? "auto",
    text: labelText,
    textAlign: opts.textAlign ?? "center",
    press: opts.press ?? true,
  });
}

export function toggle(
  labelText: string,
  value: boolean,
  opts: NodeOpts = {},
): ToggleComm {
  const id = opts.id ?? labelText;
  const c = node({
    ...opts,
    id,
    clickable: true,
    bg: opts.bg ?? (value ? "accent" : "auto"),
    text: labelText,
    textColor: opts.textColor ?? (value ? ACCENT_FG : undefined),
    textAlign: opts.textAlign ?? "center",
    press: opts.press ?? true,
  });
  return { ...c, value: c.clicked ? !value : value };
}

export type SliderOpts = NodeOpts & {
  precision?: number;
  step?: number;
  suffix?: string;
};

export function slider(
  labelText: string,
  v: number,
  min: number,
  max: number,
  opts: SliderOpts = {},
): SliderComm {
  const id = opts.id ?? labelText;
  const precision = opts.precision ?? 2;
  const step = opts.step;
  const suffix = opts.suffix ?? "";
  let val = v;
  const cached = cache.get(id);
  if (cached && active === id && mouse.leftClickDown && cached.rect.w > 0) {
    const t = clamp((mouse.x - cached.rect.x) / cached.rect.w, 0, 1);
    val = min + (max - min) * t;
  }
  if (step) val = Math.round(val / step) * step;
  const t = max > min ? (val - min) / (max - min) : 0;
  const formatted = val.toFixed(precision) + suffix;
  const display = labelText ? `${labelText}: ${formatted}` : formatted;
  const c = node({
    ...opts,
    id,
    clickable: true,
    cursor: opts.cursor ?? "ew-resize",
    fillBar: t,
    text: display,
    textAlign: opts.textAlign ?? "center",
  });
  return { ...c, value: val };
}

// === style stacks ===

function withStack<S, T>(s: S[], v: S, fn: () => T): T {
  s.push(v);
  try {
    return fn();
  } finally {
    s.pop();
  }
}
export function pushTextColor(c: string) {
  textColorStack.push(c);
}
export function popTextColor() {
  textColorStack.pop();
}
export function withTextColor<T>(c: string, fn: () => T): T {
  return withStack(textColorStack, c, fn);
}
export function pushWidth(w: SizeSpec) {
  widthStack.push(w);
}
export function popWidth() {
  widthStack.pop();
}
export function withWidth<T>(w: SizeSpec, fn: () => T): T {
  return withStack(widthStack, w, fn);
}
export function pushHeight(h: SizeSpec) {
  heightStack.push(h);
}
export function popHeight() {
  heightStack.pop();
}
export function withHeight<T>(h: SizeSpec, fn: () => T): T {
  return withStack(heightStack, h, fn);
}
export function pushFont(f: string) {
  fontStack.push(f);
}
export function popFont() {
  fontStack.pop();
}
export function withFont<T>(f: string, fn: () => T): T {
  return withStack(fontStack, f, fn);
}
// Focus-ring color for the keyboard-focus highlight. Pass "none" to hide the
// ring entirely for a block of widgets (e.g. a themed card with its own look).
export function pushFocusRing(c: string) {
  focusRingStack.push(c);
}
export function popFocusRing() {
  focusRingStack.pop();
}
export function withFocusRing<T>(c: string, fn: () => T): T {
  return withStack(focusRingStack, c, fn);
}

// === command buffer ===

export function cmd(name: string, args?: Record<string, unknown>): void {
  cmdQueue.push({ name, args });
}
export function onCommand(handler: CmdHandler): void {
  cmdHandlers.push(handler);
}

// === layout ===

// fit-size lookup. When asking for height with a knownWidth, fitSize
// propagates the width down so wrap-text descendants compute their
// real wrapped height. For col containers each child gets the full
// inner width (cross axis); for row containers we replicate pass-1's
// grow distribution so each child knows its per-cell allocated width.
function fitSize(
  node: Node,
  axis: "w" | "h",
  knownWidth?: number,
): number {
  const spec = axis === "w" ? node.width : node.height;
  if (typeof spec === "number") return spec;
  if (spec === "grow") return 0;

  if (node.children.length === 0) {
    if (
      axis === "h" &&
      node.wrap &&
      node.text !== undefined &&
      knownWidth !== undefined
    ) {
      const inner = knownWidth - node.padding.l - node.padding.r;
      const padded = node.clickable || node.bg !== undefined;
      const wrapW = padded ? inner - BUTTON_PAD_X * 2 : inner;
      const lines = wrapText(node.text, wrapW, node.font);
      const lineH = fontHeight(node.font);
      return lines.length * lineH + (padded ? BUTTON_PAD_Y * 2 : 0);
    }
    return axis === "w" ? node.intrinsicW : node.intrinsicH;
  }

  const inFlow = node.children.filter((c) => !c.isAbs);
  const totalGap = node.gap * Math.max(0, inFlow.length - 1);

  if (axis === "h" && knownWidth !== undefined) {
    const inner = knownWidth - node.padding.l - node.padding.r;
    if (node.dir === "col") {
      let total = 0;
      for (const c of inFlow) total += fitSize(c, "h", inner);
      return total + totalGap + node.padding.t + node.padding.b;
    }
    let used = 0;
    let growCount = 0;
    for (const c of inFlow) {
      if (typeof c.width === "number") used += c.width;
      else if (c.width === "fit") used += fitSize(c, "w");
      else growCount++;
    }
    const leftover = Math.max(0, inner - used - totalGap);
    const perGrow = growCount > 0 ? leftover / growCount : 0;
    let maxH = 0;
    for (const c of inFlow) {
      let cw: number;
      if (typeof c.width === "number") cw = c.width;
      else if (c.width === "fit") cw = fitSize(c, "w");
      else cw = perGrow;
      maxH = Math.max(maxH, fitSize(c, "h", cw));
    }
    return maxH + node.padding.t + node.padding.b;
  }

  const isMain = (axis === "w") === (node.dir === "row");
  let total = 0;
  for (const c of inFlow) {
    const cs = fitSize(c, axis);
    if (isMain) total += cs;
    else total = Math.max(total, cs);
  }
  if (isMain) total += totalGap;
  total +=
    axis === "w"
      ? node.padding.l + node.padding.r
      : node.padding.t + node.padding.b;
  return total;
}

function solveRoot(root: Node) {
  root.cx = root.absX;
  root.cy = root.absY;
  if (typeof root.width === "number") root.cw = root.width;
  else if (root.width === "grow") root.cw = canvasW - root.cx;
  else root.cw = fitSize(root, "w");
  if (typeof root.height === "number") root.ch = root.height;
  else if (root.height === "grow") root.ch = canvasH - root.cy;
  else root.ch = fitSize(root, "h", root.cw);
  if (root.children.length > 0) solveContainer(root);
}

function solveContainer(node: Node) {
  const isRow = node.dir === "row";
  const inFlow = node.children.filter((c) => !c.isAbs);
  const innerW = node.cw - node.padding.l - node.padding.r;
  const innerH = node.ch - node.padding.t - node.padding.b;
  const mainSize = isRow ? innerW : innerH;
  const crossSize = isRow ? innerH : innerW;
  const totalGaps = node.gap * Math.max(0, inFlow.length - 1);

  // ── pass 1: resolve widths (c.cw) for all children ────────────────
  // Widths come first so wrap-children can wrap to a known width before
  // their heights are needed. For row, width is main (incl. grow distribution).
  // For col, width is cross.
  if (isRow) {
    let usedW = 0;
    let growW = 0;
    for (const c of inFlow) {
      if (typeof c.width === "number") {
        c.cw = c.width;
        usedW += c.cw;
      } else if (c.width === "fit") {
        c.cw = fitSize(c, "w");
        usedW += c.cw;
      } else {
        growW++;
      }
    }
    const leftoverW = Math.max(0, mainSize - usedW - totalGaps);
    const perGrowW = growW > 0 ? leftoverW / growW : 0;
    for (const c of inFlow) {
      if (c.width === "grow") c.cw = perGrowW;
    }
  } else {
    for (const c of inFlow) {
      if (typeof c.width === "number") c.cw = c.width;
      else if (c.width === "grow") c.cw = crossSize;
      else {
        c.cw = fitSize(c, "w");
        if (node.align === "stretch") c.cw = crossSize;
      }
    }
  }

  // ── pass 2: wrap text → override intrinsicH for wrap-children ─────
  for (const c of inFlow) {
    if (c.wrap && c.text !== undefined && c.cw > 0) {
      const inner = c.cw - c.padding.l - c.padding.r;
      const padded = c.clickable || c.bg !== undefined;
      const wrapW = padded ? inner - BUTTON_PAD_X * 2 : inner;
      const lines = wrapText(c.text, wrapW, c.font);
      c.wrappedLines = lines;
      const lineH = fontHeight(c.font);
      c.intrinsicH = lines.length * lineH + (padded ? BUTTON_PAD_Y * 2 : 0);
    }
  }

  // ── pass 3: resolve heights (c.ch) for all children ───────────────
  // by now c.cw is set for every child (from pass 1), so we can pass it
  // as knownWidth to fitSize so wrap-text descendants size correctly.
  if (isRow) {
    for (const c of inFlow) {
      if (typeof c.height === "number") c.ch = c.height;
      else if (c.height === "grow") c.ch = crossSize;
      else {
        c.ch = c.wrappedLines ? c.intrinsicH : fitSize(c, "h", c.cw);
        if (node.align === "stretch") c.ch = crossSize;
      }
    }
  } else {
    let usedH = 0;
    let growH = 0;
    for (const c of inFlow) {
      if (typeof c.height === "number") {
        c.ch = c.height;
        usedH += c.ch;
      } else if (c.height === "fit") {
        c.ch = c.wrappedLines ? c.intrinsicH : fitSize(c, "h", c.cw);
        usedH += c.ch;
      } else {
        growH++;
      }
    }
    const leftoverH = Math.max(0, mainSize - usedH - totalGaps);
    const perGrowH = growH > 0 ? leftoverH / growH : 0;
    for (const c of inFlow) {
      if (c.height === "grow") c.ch = perGrowH;
    }
  }

  const innerX = node.cx + node.padding.l;
  const innerY = node.cy + node.padding.t;
  let totalMain = 0;
  for (const c of inFlow) totalMain += isRow ? c.cw : c.ch;
  totalMain += totalGaps;
  let mainStart = 0;
  let extraGap = 0;
  switch (node.justify) {
    case "center":
      mainStart = (mainSize - totalMain) / 2;
      break;
    case "end":
      mainStart = mainSize - totalMain;
      break;
    case "between":
      if (inFlow.length > 1)
        extraGap = (mainSize - totalMain) / (inFlow.length - 1);
      break;
  }
  let cursor = mainStart;
  for (const c of inFlow) {
    const cMain = isRow ? c.cw : c.ch;
    const cCross = isRow ? c.ch : c.cw;
    let crossOff = 0;
    switch (node.align) {
      case "center":
        crossOff = (crossSize - cCross) / 2;
        break;
      case "end":
        crossOff = crossSize - cCross;
        break;
    }
    if (isRow) {
      c.cx = innerX + cursor;
      c.cy = innerY + crossOff;
    } else {
      c.cx = innerX + crossOff;
      c.cy = innerY + cursor;
    }
    cursor += cMain + node.gap + extraGap;
    if (c.children.length > 0) solveContainer(c);
  }

  // record content size for scrollable; clamp scroll to current bounds
  if (node.scrollable && node.id) {
    const s = getState(node.id);
    s.contentH = totalMain + node.padding.t + node.padding.b;
    const maxScroll = Math.max(0, s.contentH - node.ch);
    if (s.scrollY > maxScroll) s.scrollY = maxScroll;
    if (s.scrollY < 0) s.scrollY = 0;
  }

  for (const c of node.children) {
    if (c.isAbs) solveRoot(c);
  }
}

// === drawing ===

function setRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  if (!ctx) return;
  ctx.beginPath();
  if (radius > 0) ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
}

function resolveBg(spec: BgSpec, hotT: number, activeT: number): string {
  if (spec === "auto") {
    return lerpColor(lerpColor(BG, BG_HOT, hotT), BG_ACTIVE, activeT);
  }
  if (spec === "accent") {
    return lerpColor(ACCENT, ACCENT_HOT, hotT);
  }
  return spec;
}

function drawNode(node: Node, scrollAccum: number) {
  if (!ctx) return;

  const prevDrawWindow = currentDrawWindow;
  if (node.windowRoot && node.id) currentDrawWindow = node.id;

  const rx = node.cx;
  const ry = node.cy - scrollAccum;
  const rw = node.cw;
  const rh = node.ch;

  const s = node.id ? getState(node.id) : null;
  if (s) {
    s.rect = { x: rx, y: ry, w: rw, h: rh };
    s.ownerWindow = currentDrawWindow;
    const isHovering = hot === node.id;
    const isActive = active === node.id;
    s.hotT = expDecay(s.hotT, isHovering ? 1 : 0, ANIM_DECAY);
    s.activeT = expDecay(s.activeT, isActive ? 1 : 0, ANIM_DECAY);
    s.focusT = expDecay(s.focusT, focused === node.id ? 1 : 0, ANIM_DECAY);
    // last-wins z-order: latest call with cursor over wins hot
    if (hit(s.rect)) {
      nextHot = node.id;
      if (node.scrollable) nextScrollTarget = node.id;
      if (node.cursor) nextCursor = node.cursor;
    }
    // collect Tab-focusable widgets in depth-first draw order (skip
    // internal sub-ids like "#thumb", "#drag", "#resize")
    if (node.clickable && !node.id.includes("#")) {
      focusList.push(node.id);
    }
  }
  const hotT = s?.hotT ?? 0;
  const activeT = s?.activeT ?? 0;

  // tactile depress — scale the whole node slightly toward its center while
  // held. Opt in via press: true (button/toggle default it on). The hit rect
  // (s.rect, set above) stays full-size so the hitbox doesn't shrink.
  const pressing = node.press && activeT > 0.001;
  if (pressing) {
    const sc = 1 - 0.045 * activeT;
    const ccx = rx + rw / 2;
    const ccy = ry + rh / 2;
    ctx.save();
    ctx.translate(ccx, ccy);
    ctx.scale(sc, sc);
    ctx.translate(-ccx, -ccy);
  }

  if (node.bg !== undefined) {
    ctx.fillStyle = resolveBg(node.bg, hotT, activeT);
    setRectPath(rx, ry, rw, rh, node.radius);
    ctx.fill();
  }

  if (node.fillBar !== undefined) {
    ctx.fillStyle = TRACK;
    setRectPath(rx, ry, rw, rh, node.radius);
    ctx.fill();
    ctx.fillStyle = resolveBg("auto", hotT, activeT);
    setRectPath(
      rx,
      ry,
      rw * clamp(node.fillBar, 0, 1),
      rh,
      node.radius,
    );
    ctx.fill();
  }

  if (node.border) {
    ctx.strokeStyle = node.border;
    ctx.lineWidth = 1;
    setRectPath(rx + 0.5, ry + 0.5, rw - 1, rh - 1, node.radius);
    ctx.stroke();
  }

  // keyboard focus ring — soft animated halo + crisp inner stroke. Color is
  // configurable (focusRing opt / withFocusRing); "none" disables it. Drawn
  // while focusT > 0 so it fades in and out instead of popping.
  const ring = node.focusRing ?? FOCUS_RING;
  if (node.id && ring !== "none" && (s?.focusT ?? 0) > 0.01) {
    const t = s!.focusT;
    const off = 3;
    const r2 = node.radius > 0 ? node.radius + off : 4;
    ctx.save();
    ctx.strokeStyle = ring;
    // outer soft halo
    ctx.globalAlpha = t * 0.22;
    ctx.lineWidth = 5;
    setRectPath(rx - off, ry - off, rw + off * 2, rh + off * 2, r2);
    ctx.stroke();
    // crisp inner ring
    ctx.globalAlpha = t;
    ctx.lineWidth = 1.5;
    setRectPath(rx - off, ry - off, rw + off * 2, rh + off * 2, r2);
    ctx.stroke();
    ctx.restore();
  }

  if (node.text !== undefined) {
    const scrollX = node.textScrollX ?? 0;
    // clip text to the rect when it scrolls or the node opts into clipping, so
    // overflow and rounded corners are respected.
    const clipText = node.textScrollX !== undefined || node.clip;
    if (clipText) {
      ctx.save();
      setRectPath(rx, ry, rw, rh, node.radius);
      ctx.clip();
    }
    ctx.font = node.font;
    const fh = fontHeight(node.font);

    // selection highlight (single-line/text nodes; behind the glyphs)
    if (
      node.selStart !== undefined &&
      node.selEnd !== undefined &&
      node.selEnd > node.selStart &&
      !node.wrappedLines
    ) {
      const preW = ctx.measureText(node.text.slice(0, node.selStart)).width;
      const selW = ctx.measureText(
        node.text.slice(node.selStart, node.selEnd),
      ).width;
      ctx.fillStyle = SELECTION_BG;
      ctx.fillRect(
        rx + node.padding.l + preW - scrollX,
        ry + rh / 2 - fh / 2,
        selW,
        fh,
      );
    }

    ctx.fillStyle = node.textColor ?? FG;
    ctx.textAlign = node.textAlign;
    const tx =
      node.textAlign === "center"
        ? rx + rw / 2
        : rx + node.padding.l - scrollX;
    if (node.wrappedLines) {
      const lineH = fontHeight(node.font);
      const startY = ry + node.padding.t + lineH / 2;
      for (let i = 0; i < node.wrappedLines.length; i++) {
        ctx.fillText(node.wrappedLines[i]!, tx, startY + i * lineH);
      }
    } else {
      ctx.fillText(node.text, tx, ry + rh / 2);
    }

    // text caret — slides to its target x with expDecay, stays solid for a
    // beat after a move, then blinks.
    if (node.caretAt !== undefined) {
      const targetX = ctx.measureText(node.text.slice(0, node.caretAt)).width;
      let drawXoff = targetX;
      if (s) {
        if (s.caretX < 0) s.caretX = targetX; // first show: snap, don't slide
        if (Math.abs(s.caretX - targetX) > 0.5) {
          s.caretShownAt = performance.now();
        }
        s.caretX = expDecay(s.caretX, targetX, 30);
        drawXoff = s.caretX;
      }
      const sinceMove = s ? performance.now() - s.caretShownAt : 1e9;
      const blinkOn = Math.floor(performance.now() / 530) % 2 === 0;
      if (sinceMove < 450 || blinkOn) {
        const caretX = Math.round(rx + node.padding.l + drawXoff - scrollX);
        const caretY = ry + rh / 2 - fh / 2;
        ctx.fillStyle = node.textColor ?? FG;
        ctx.fillRect(caretX, caretY, 1.5, fh);
      }
    }

    if (clipText) ctx.restore();
  }

  // children: in-flow inside clip, abs deferred to top of z-stack. A node
  // clips its children when scrollable (to hide overflow) or when clip: true
  // is set explicitly (e.g. a rounded card whose children would otherwise
  // poke out past the corners).
  let childScroll = scrollAccum;
  const doClip = (node.scrollable && !!s) || node.clip;
  if (doClip) {
    ctx.save();
    setRectPath(rx, ry, rw, rh, node.radius);
    ctx.clip();
  }
  if (node.scrollable && s) childScroll += s.scrollY;
  for (const c of node.children) {
    if (c.isAbs) deferredAbs.push(c);
    else drawNode(c, childScroll);
  }
  if (doClip) ctx.restore();
  if (node.scrollable && s) drawScrollbar(rx, ry, rw, rh, s, node.id);

  if (pressing) ctx.restore();
  currentDrawWindow = prevDrawWindow;
}

const THUMB_W_HOT = 8; // widen the hover/active thumb a touch
const THUMB_HIT_PAD = 4; // expand the hit area horizontally for easier grabbing

function drawScrollbar(
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  containerState: WidgetState,
  containerId: string,
) {
  if (!ctx) return;
  const contentH = containerState.contentH;
  if (contentH <= rh) return;

  const trackX = rx + rw - SCROLLBAR_W - SCROLLBAR_MARGIN;
  const trackY = ry + SCROLLBAR_MARGIN;
  const trackH = rh - SCROLLBAR_MARGIN * 2;
  const maxScroll = contentH - rh;
  const thumbH = Math.max(20, (trackH * rh) / contentH);
  const thumbY =
    trackY + (trackH - thumbH) * (containerState.scrollY / Math.max(1, maxScroll));

  const thumbId = `${containerId}#thumb`;
  const ts = getState(thumbId);
  ts.lastTouched = frameIdx;
  // store the visible rect for hit-testing; widen by THUMB_HIT_PAD on each side
  ts.rect = {
    x: trackX - THUMB_HIT_PAD,
    y: thumbY,
    w: SCROLLBAR_W + THUMB_HIT_PAD * 2,
    h: thumbH,
  };

  const isActive = active === thumbId;
  const overThumb = hit(ts.rect);
  const trackRect = {
    x: trackX - THUMB_HIT_PAD,
    y: trackY,
    w: SCROLLBAR_W + THUMB_HIT_PAD * 2,
    h: trackH,
  };
  const overTrack = !overThumb && hit(trackRect);

  if (overThumb || isActive) {
    nextHot = thumbId;
    nextCursor = isActive ? "grabbing" : "grab";
  }

  // dragging — thumb tracks the mouse
  if (isActive && mouse.leftClickDown) {
    const dy = mouse.y - ts.pressY;
    const scale = trackH - thumbH > 0 ? maxScroll / (trackH - thumbH) : 0;
    containerState.scrollY = clamp(
      ts.pressData.x + dy * scale, // pressData.x = scrollY at press
      0,
      maxScroll,
    );
  }

  // click on empty track → page-jump
  if (overTrack && mouse.justLeftClicked && active === null) {
    const delta = mouse.y < thumbY ? -rh : rh;
    containerState.scrollY = clamp(
      containerState.scrollY + delta,
      0,
      maxScroll,
    );
  }

  // track
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  setRectPath(trackX, trackY, SCROLLBAR_W, trackH, SCROLLBAR_W / 2);
  ctx.fill();

  // thumb (wider/brighter when hot or active)
  const thumbHot = nextHot === thumbId;
  const thumbW = thumbHot ? THUMB_W_HOT : SCROLLBAR_W;
  const thumbDx = thumbHot ? -(THUMB_W_HOT - SCROLLBAR_W) / 2 : 0;
  ctx.fillStyle = isActive
    ? "rgba(255,255,255,0.75)"
    : thumbHot
      ? "rgba(255,255,255,0.6)"
      : "rgba(255,255,255,0.45)";
  setRectPath(trackX + thumbDx, thumbY, thumbW, thumbH, thumbW / 2);
  ctx.fill();
}
