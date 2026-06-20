import { mouse } from "./input";

const FONT = "14px system-ui, sans-serif";
const BG = "#1f2937";
const BG_HOT = "#374151";
const BG_ACTIVE = "#4b5563";
const FG = "#f3f4f6";
const ACCENT = "#4ade80";
const ACCENT_FG = "#052e16";
const TRACK = "#0f172a";

let ctx: CanvasRenderingContext2D | null = null;
let hot: string | null = null;
let active: string | null = null;
let prevLeftDown = false;
let leftReleased = false;

export function begin(c: CanvasRenderingContext2D) {
  ctx = c;
  hot = null;
  leftReleased = prevLeftDown && !mouse.leftClickDown;
  ctx.font = FONT;
  ctx.textBaseline = "middle";
}

export function end() {
  prevLeftDown = mouse.leftClickDown;
  if (!mouse.leftClickDown) active = null;
  ctx = null;
}

function hit(x: number, y: number, w: number, h: number) {
  return (
    mouse.onCanvas &&
    mouse.x >= x &&
    mouse.x < x + w &&
    mouse.y >= y &&
    mouse.y < y + h
  );
}

export function label(text: string, x: number, y: number) {
  if (!ctx) return;
  ctx.fillStyle = FG;
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
}

export function button(
  id: string,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!ctx) return false;
  const over = hit(x, y, w, h);
  if (over) hot = id;
  if (over && mouse.justLeftClicked) active = id;

  const isHot = hot === id;
  const isActive = active === id;
  ctx.fillStyle = isActive && isHot ? BG_ACTIVE : isHot ? BG_HOT : BG;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = FG;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2);

  return isActive && isHot && leftReleased;
}

export function toggle(
  id: string,
  text: string,
  value: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!ctx) return value;
  const over = hit(x, y, w, h);
  if (over) hot = id;
  if (over && mouse.justLeftClicked) active = id;

  const isHot = hot === id;
  const isActive = active === id;
  ctx.fillStyle = value
    ? isHot
      ? "#86efac"
      : ACCENT
    : isActive && isHot
      ? BG_ACTIVE
      : isHot
        ? BG_HOT
        : BG;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = value ? ACCENT_FG : FG;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2);

  if (isActive && isHot && leftReleased) return !value;
  return value;
}

export function slider(
  id: string,
  text: string,
  v: number,
  min: number,
  max: number,
  x: number,
  y: number,
  w: number,
  h: number,
): number {
  if (!ctx) return v;
  const over = hit(x, y, w, h);
  if (over) hot = id;
  if (over && mouse.justLeftClicked) active = id;

  let val = v;
  if (active === id && mouse.leftClickDown) {
    const t = Math.min(1, Math.max(0, (mouse.x - x) / w));
    val = min + (max - min) * t;
  }
  const t = (val - min) / (max - min);

  ctx.fillStyle = TRACK;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = active === id ? BG_ACTIVE : hot === id ? BG_HOT : BG;
  ctx.fillRect(x, y, w * t, h);
  ctx.fillStyle = FG;
  ctx.textAlign = "center";
  ctx.fillText(`${text}: ${val.toFixed(2)}`, x + w / 2, y + h / 2);

  return val;
}
