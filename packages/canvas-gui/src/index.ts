// Public entry point for canvas-gui.
//
// The library is small enough to ship as a handful of source files you can
// either consume as a workspace dependency or vendor straight into your
// project. See ../README.md.

export * from "./ui";
export {
  mouse,
  keysDown,
  keysJustPressed,
  keysJustReleased,
  keysTyped,
  resetInput,
  registerInputListeners,
} from "./input";
export { startLoop } from "./canvas-loop";
