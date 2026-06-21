// Screenshot a demo from the running dev server for visual verification.
//
//   bun scripts/shot.ts <demo> [outfile] [--w 1280] [--h 820] [--wait 1200]
//                       [--port 3001] [--cdp 9222] [--mobile]
//
// Drives a headless Chrome over CDP/WebSocket (Playwright's pipe transport
// hangs in this environment). Start Chrome first with scripts/chrome.sh, and
// the dev server with `bun run demos`.
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const demo = positional[0] ?? "docs";
const out = positional[1] ?? `screenshots/${demo}.png`;
const flag = (n: string, d: number) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : d;
};
const has = (n: string) => args.includes(`--${n}`);

const width = flag("w", 1280);
const height = flag("h", 820);
const waitMs = flag("wait", 1300);
const port = flag("port", 3001);
const cdpPort = flag("cdp", 9222);
const scale = flag("scale", 2);
const mobile = has("mobile");
const url = `http://localhost:${port}/#${demo}`;

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
await send("Network.enable", {}, sessionId);
await send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
await send("Emulation.setDeviceMetricsOverride", {
  width, height, deviceScaleFactor: scale, mobile,
}, sessionId);

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

const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
await Bun.write(out, Buffer.from(data, "base64"));
await send("Target.closeTarget", { targetId });
ws.close();

if (errors.length) {
  console.error(`PAGE ERRORS (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 15)) console.error("  " + e);
  process.exit(1);
}
console.log(`shot: ${url} -> ${out} (${width}x${height}@${scale}x)`);
