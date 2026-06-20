import { startLoop } from "./canvas-render-loop";
import { registerInputListeners } from "./input";
import { tick } from "./picker";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

startLoop(canvas, tick);
registerInputListeners(canvas);
