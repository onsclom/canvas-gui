// Dev server that always reflects current source. Bun's built-in HTML dev
// server doesn't watch the workspace library (it's reached through a
// node_modules symlink, which the watcher skips), so library edits go stale and
// demo/library versions skew into TypeErrors. This rebuilds from source on any
// change under packages/*/src and live-reloads the browser.
//
//   bun scripts/dev.ts [demos|landing] [--port 3000]
import { watch } from "node:fs";

const args = process.argv.slice(2);
const pkg = args.find((a) => !a.startsWith("--")) ?? "demos";
const portFlag = args.indexOf("--port");
const port = portFlag >= 0 ? Number(args[portFlag + 1]) : 3000;

const root = new URL("..", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
const entry = `${root}/packages/${pkg}/index.html`;
const outdir = `${root}/.dev/${pkg}`;

const clients = new Set<ReadableStreamDefaultController>();
let building = false;
let pending = false;
let buildVersion = 0;

async function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const t0 = performance.now();
  // Spawn a fresh `bun build` per rebuild: an in-process Bun.build caches the
  // symlinked workspace library across calls, so library edits would be missed.
  const proc = Bun.spawn(["bun", "build", entry, "--outdir", outdir], {
    cwd: root,
    stderr: "pipe",
    stdout: "ignore",
  });
  const code = await proc.exited;
  building = false;
  if (code !== 0) {
    console.error(
      "✗ build failed:\n" + (await new Response(proc.stderr).text()),
    );
  } else {
    buildVersion++;
    console.log(`✓ rebuilt ${pkg} in ${(performance.now() - t0).toFixed(0)}ms`);
    for (const c of clients) {
      try {
        c.enqueue(`data: ${buildVersion}\n\n`);
      } catch {}
    }
  }
  if (pending) {
    pending = false;
    await build();
  }
}

await build();

const RELOAD_SNIPPET = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

// Bun won't take over a port already held by a stale dev server — it would
// throw EADDRINUSE and you'd keep hitting the old (frozen) bundle. So find a
// free port and announce it loudly instead of colliding.
function serveOn(startPort: number) {
  for (let p = startPort; p < startPort + 20; p++) {
    try {
      return makeServer(p);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "EADDRINUSE" || String((e as Error).message).includes("EADDRINUSE")) {
        console.warn(`port ${p} in use (stale dev server?), trying ${p + 1}…`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`no free port in ${startPort}..${startPort + 20}`);
}

function makeServer(p: number) {
  return Bun.serve({
    port: p,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/__reload") {
        const stream = new ReadableStream({
          start(c) {
            clients.add(c);
          },
          cancel() {},
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      }
      const path = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(outdir + path);
      if (!(await file.exists())) return new Response("404", { status: 404 });
      if (path === "/index.html") {
        const html = (await file.text()).replace(
          "</body>",
          RELOAD_SNIPPET + "</body>",
        );
        return new Response(html, { headers: { "content-type": "text/html" } });
      }
      return new Response(file, { headers: { "cache-control": "no-store" } });
    },
  });
}

const server = serveOn(port);
console.log(
  `\n  ▶ dev: ${pkg} on http://localhost:${server.port}/` +
    `  (rebuilds + live-reloads on source changes)\n`,
);

// watch both the package and the library source
let debounce: ReturnType<typeof setTimeout> | null = null;
const schedule = () => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void build(), 80);
};
for (const dir of [
  `${root}/packages/${pkg}/src`,
  `${root}/packages/canvas-gui/src`,
]) {
  watch(dir, { recursive: true }, schedule);
}
