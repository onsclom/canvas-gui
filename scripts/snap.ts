// Build the demos, serve the fresh bundle, and screenshot one demo — all in
// one shot. Avoids the dev server's stale-bundle caching so every screenshot
// reflects the current source. Requires headless Chrome on the CDP port
// (scripts/chrome.sh).
//
//   bun scripts/snap.ts <demo> [outfile] [--w 1280] [--h 820] [--wait 1200]
//                       [--pkg demos] [--cdp 9222] [--mobile]
import { rm } from "node:fs/promises";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const demo = positional[0] ?? "docs";
const out = positional[1] ?? `screenshots/${demo}.png`;
const sflag = (n: string, d: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : d;
};
const nflag = (n: string, d: number) => Number(sflag(n, String(d)));
const has = (n: string) => args.includes(`--${n}`);

const pkg = sflag("pkg", "demos");
const width = nflag("w", 1280);
const height = nflag("h", 820);
const waitMs = nflag("wait", 1300);
const cdpPort = nflag("cdp", 9222);
const scale = nflag("scale", 2);
const mobile = has("mobile");

// 1. build
const outdir = `/tmp/cg-snap-${pkg}`;
await rm(outdir, { recursive: true, force: true });
const build = await Bun.build({
  entrypoints: [`packages/${pkg}/index.html`],
  outdir,
  minify: false,
});
if (!build.success) {
  console.error("BUILD FAILED:");
  for (const m of build.logs) console.error("  " + m.message);
  process.exit(1);
}

// 2. serve the built dir
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === "/") p = "/index.html";
    const f = Bun.file(outdir + p);
    return (await f.exists()) ? new Response(f) : new Response("404", { status: 404 });
  },
});
const url = `http://localhost:${server.port}/#${demo}`;

// 3. drive headless Chrome over CDP to screenshot
const ver = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 1;
const pending = new Map<number, (v: any) => void>();
const errors: string[] = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data as string);
  if (m.id && pending.has(m.id)) {
    if (m.error) console.error(`CDP error (id ${m.id}):`, JSON.stringify(m.error));
    pending.get(m.id)!(m.result);
    pending.delete(m.id);
  } else if (m.method === "Runtime.exceptionThrown") {
    errors.push(m.params?.exceptionDetails?.exception?.description ?? "exception");
  } else if (m.method === "Runtime.consoleAPICalled" && m.params?.type === "error") {
    errors.push(m.params.args?.map((a: any) => a.value ?? a.description).join(" "));
  }
};
const send = (method: string, params: any = {}, sessionId?: string) =>
  new Promise<any>((res) => {
    const id = nextId++;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", {
  url: "about:blank",
  width,
  height,
  newWindow: true,
});
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile }, sessionId);

const loaded = new Promise<void>((res) => {
  const prev = ws.onmessage!;
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data as string);
    if (m.method === "Page.loadEventFired") res();
    prev.call(ws, ev);
  };
});
await send("Page.navigate", { url }, sessionId);
await Promise.race([loaded, new Promise((r) => setTimeout(r, 8000))]);
await new Promise((r) => setTimeout(r, waitMs));

// optional interaction before the final capture, to verify behavior:
//   --click X,Y   (repeatable) click at CSS coords
//   --type TEXT   (repeatable) type text into whatever is focused
//   --key KEY     (repeatable) press a key (e.g. Enter, Tab)
// actions run in argv order, with a short settle between each.
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function click(x: number, y: number) {
  const base = { x, y, button: "left", clickCount: 1 };
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...base }, sessionId);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...base }, sessionId);
}
async function type(text: string) {
  for (const ch of text) {
    // set key + text so canvas-gui's keydown handler sees e.key === ch
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch }, sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch }, sessionId);
    await pause(20);
  }
}
async function drag(x1: number, y1: number, x2: number, y2: number) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x1, y: y1 }, sessionId);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x1, y: y1, button: "left", clickCount: 1 }, sessionId);
  await pause(60);
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = y1 + ((y2 - y1) * i) / steps;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left" }, sessionId);
    await pause(30);
  }
  await pause(60);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y: y2, button: "left", clickCount: 1 }, sessionId);
}
async function key(k: string) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, windowsVirtualKeyCode: k === "Enter" ? 13 : k === "Tab" ? 9 : 0 }, sessionId);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k }, sessionId);
}
for (let a = 0; a < args.length; a++) {
  if (args[a] === "--click") {
    const [x, y] = args[++a]!.split(",").map(Number);
    await click(x!, y!);
    await pause(220);
  } else if (args[a] === "--drag") {
    const [x1, y1, x2, y2] = args[++a]!.split(",").map(Number);
    await drag(x1!, y1!, x2!, y2!);
    await pause(200);
  } else if (args[a] === "--type") {
    await type(args[++a]!);
    await pause(150);
  } else if (args[a] === "--key") {
    await key(args[++a]!);
    await pause(150);
  }
}
if (["--click", "--type", "--key", "--drag"].some((f) => args.includes(f))) {
  await pause(400);
}

const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
await Bun.write(out, Buffer.from(data, "base64"));
await send("Target.closeTarget", { targetId });
ws.close();
server.stop(true);

if (errors.length) {
  console.error(`PAGE ERRORS (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 15)) console.error("  " + e);
  process.exit(1);
}
console.log(`snap: #${demo} -> ${out} (${width}x${height}@${scale}x)`);
