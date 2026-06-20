// vendor the canvas-gui library source into another project.
//
//   bun run vendor <destination-directory>
//
// copies the contents of packages/canvas-gui/src/ → <destination>/. the
// destination is created if it doesn't exist.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { cp } from "node:fs/promises";
import { resolve } from "node:path";

const dest = process.argv[2];
if (!dest) {
  console.error("Usage: bun run vendor <destination-directory>");
  process.exit(1);
}

const src = resolve(import.meta.dir, "..", "packages/canvas-gui/src");
const target = resolve(dest);

if (!existsSync(src)) {
  console.error(`source not found: ${src}`);
  process.exit(1);
}
if (!existsSync(target)) mkdirSync(target, { recursive: true });

await cp(src, target, { recursive: true });

console.log(`✓ vendored canvas-gui → ${target}`);
console.log("files:");
for (const f of readdirSync(target)) console.log("  " + f);
console.log();
console.log("now import from a relative path:");
console.log('  import * as ui from "./canvas-gui";');
