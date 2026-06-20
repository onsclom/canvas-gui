import { registerInputListeners, startLoop } from "canvas-gui";
import { tick } from "./landing";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

startLoop(canvas, tick);
registerInputListeners(canvas);
