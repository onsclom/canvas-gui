import { keysJustPressed } from "canvas-gui";
import * as ui from "canvas-gui";

const WORDS = [
  "ABOUT", "ABOVE", "ABUSE", "AGENT", "ALBUM",
  "ALERT", "ALIEN", "ALONE", "ALONG", "AMONG",
  "ANGER", "ANGLE", "APPLE", "ARGUE", "ARISE",
  "AVOID", "AWARD", "AWARE", "BASIC", "BEACH",
  "BEGAN", "BEGIN", "BELOW", "BIRTH", "BLACK",
  "BLAME", "BLIND", "BLOCK", "BLOOD", "BOARD",
  "BRAIN", "BRAVE", "BREAD", "BREAK", "BRIEF",
  "BROAD", "BROWN", "BUILD", "BUILT", "BUYER",
  "CABLE", "CARRY", "CATCH", "CAUSE", "CHAIN",
  "CHAIR", "CHART", "CHASE", "CHEAP", "CHECK",
  "CHEST", "CHIEF", "CHILD", "CHOSE", "CIVIL",
  "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLICK",
  "CLIMB", "CLOCK", "CLOSE", "CLOUD", "COAST",
  "COULD", "COUNT", "COURT", "COVER", "CRAFT",
  "CRASH", "CRAZY", "CREAM", "CRIME", "CROSS",
  "CROWD", "CROWN", "CURVE", "CYCLE", "DAILY",
  "DANCE", "DEALT", "DEATH", "DEPTH", "DOING",
  "DOUBT", "DOZEN", "DRAFT", "DRAMA", "DRAWN",
  "DREAM", "DRESS", "DRINK", "DRIVE", "DROVE",
  "DYING", "EAGER", "EARLY",
];

const ROWS = 6;
const COLS = 5;

type Eval = "correct" | "present" | "absent";
type LetterStatus = Eval | "unknown";

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]!;
}

const state = {
  target: pickWord(),
  guesses: [] as string[],
  current: "",
  status: "playing" as "playing" | "won" | "lost",
  message: "",
};

function evalGuess(guess: string, target: string): Eval[] {
  const result: Eval[] = new Array(guess.length).fill("absent");
  const used: boolean[] = new Array(target.length).fill(false);
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i]!;
    for (let j = 0; j < target.length; j++) {
      if (!used[j] && target[j] === ch) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

function bestLetterStatus(letter: string): LetterStatus {
  const rank: Record<LetterStatus, number> = {
    unknown: 0,
    absent: 1,
    present: 2,
    correct: 3,
  };
  let best: LetterStatus = "unknown";
  for (const guess of state.guesses) {
    const evals = evalGuess(guess, state.target);
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === letter && rank[evals[i]!] > rank[best]) {
        best = evals[i]!;
      }
    }
  }
  return best;
}

// Both physical keys and virtual key clicks emit the same commands —
// one mutation path (Part 8).
ui.onCommand((name, args) => {
  if (state.status !== "playing" && name !== "wordle.reset") return;

  switch (name) {
    case "wordle.input": {
      const k = String(args!["key"]).toUpperCase();
      if (state.current.length < COLS && /^[A-Z]$/.test(k)) {
        state.current += k;
        state.message = "";
      }
      break;
    }
    case "wordle.backspace":
      state.current = state.current.slice(0, -1);
      state.message = "";
      break;
    case "wordle.submit": {
      if (state.current.length !== COLS) {
        state.message = "Not enough letters";
        break;
      }
      state.guesses.push(state.current);
      if (state.current === state.target) {
        state.status = "won";
        state.message = `Solved in ${state.guesses.length}!`;
      } else if (state.guesses.length >= ROWS) {
        state.status = "lost";
        state.message = `The word was ${state.target}`;
      } else {
        state.message = "";
      }
      state.current = "";
      break;
    }
    case "wordle.reset":
      state.target = pickWord();
      state.guesses = [];
      state.current = "";
      state.status = "playing";
      state.message = "";
      break;
  }
});

const C_CORRECT = "#22c55e";
const C_PRESENT = "#eab308";
const C_ABSENT = "#52525b";
const BORDER_EMPTY = "#374151";
const BORDER_PENDING = "#9ca3af";
const KEY_UNKNOWN_BG = "#475569";
const FG = "#f3f4f6";

const TILE_SIZE = 52;
const TILE_GAP = 5;
const KEY_W = 32;
const KEY_H = 44;
const KEY_GAP = 4;

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function evalColor(e: Eval): string {
  switch (e) {
    case "correct":
      return C_CORRECT;
    case "present":
      return C_PRESENT;
    case "absent":
      return C_ABSENT;
  }
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, w, h);

  // route physical keyboard input through the same commands as virtual keys
  for (const k of keysJustPressed) {
    if (state.status === "playing") {
      if (k === "Enter") ui.cmd("wordle.submit");
      else if (k === "Backspace") ui.cmd("wordle.backspace");
      else if (/^[a-zA-Z]$/.test(k)) ui.cmd("wordle.input", { key: k });
    } else if (k === "Enter") {
      ui.cmd("wordle.reset");
    }
  }

  ui.col(
    {
      x: 0,
      y: 50,
      width: "grow",
      height: "grow",
      align: "center",
      padding: 16,
      gap: 14,
    },
    () => {
      // title
      ui.withFont("bold 30px system-ui, sans-serif", () => {
        ui.label("WORDLE");
      });

      // status message — always reserve 22px so layout doesn't jump
      ui.row({ height: 22, align: "center" }, () => {
        if (state.message) ui.label(state.message);
      });

      // grid
      ui.col({ gap: TILE_GAP }, () => {
        for (let r = 0; r < ROWS; r++) {
          ui.row({ gap: TILE_GAP }, () => {
            for (let c = 0; c < COLS; c++) {
              drawTile(r, c);
            }
          });
        }
      });

      // keyboard
      ui.col({ gap: 6, align: "center" }, () => {
        for (let ri = 0; ri < KEY_ROWS.length; ri++) {
          const isLast = ri === KEY_ROWS.length - 1;
          ui.row({ gap: KEY_GAP, align: "center" }, () => {
            if (isLast) {
              if (
                ui.button("ENTER", {
                  id: "kbd-enter",
                  width: 58,
                  height: KEY_H,
                  radius: 4,
                  font: "bold 12px system-ui, sans-serif",
                }).clicked
              ) {
                if (state.status === "playing") ui.cmd("wordle.submit");
                else ui.cmd("wordle.reset");
              }
            }
            for (const letter of KEY_ROWS[ri]!) {
              drawKey(letter);
            }
            if (isLast) {
              if (
                ui.button("⌫", {
                  id: "kbd-back",
                  width: 58,
                  height: KEY_H,
                  radius: 4,
                  font: "bold 18px system-ui, sans-serif",
                }).clicked
              ) {
                ui.cmd("wordle.backspace");
              }
            }
          });
        }
      });

      // post-game CTA
      if (state.status !== "playing") {
        if (
          ui.button("New Game", {
            id: "newgame",
            width: 150,
            height: 38,
            radius: 6,
          }).clicked
        ) {
          ui.cmd("wordle.reset");
        }
      }
    },
  );
}

function drawTile(row: number, col: number) {
  const isSubmitted = row < state.guesses.length;
  const isPendingRow =
    row === state.guesses.length && state.status === "playing";

  let letter = "";
  let bg: string | undefined;
  let border: string | undefined = BORDER_EMPTY;
  let textColor = FG;

  if (isSubmitted) {
    const guess = state.guesses[row]!;
    letter = guess[col]!;
    const evals = evalGuess(guess, state.target);
    bg = evalColor(evals[col]!);
    border = undefined;
    textColor = "#ffffff";
  } else if (isPendingRow) {
    border = col < state.current.length ? BORDER_PENDING : BORDER_EMPTY;
    if (col < state.current.length) letter = state.current[col]!;
  }

  ui.node({
    width: TILE_SIZE,
    height: TILE_SIZE,
    bg,
    border,
    radius: 4,
    text: letter,
    textAlign: "center",
    textColor,
    font: "bold 24px system-ui, sans-serif",
  });
}

function drawKey(letter: string) {
  const status = bestLetterStatus(letter);
  const opts: ui.NodeOpts = {
    id: `kbd-${letter}`,
    width: KEY_W,
    height: KEY_H,
    radius: 4,
    font: "bold 14px system-ui, sans-serif",
  };
  if (status === "unknown") {
    opts.bg = KEY_UNKNOWN_BG;
    opts.textColor = "#ffffff";
  } else {
    opts.bg = evalColor(status);
    opts.textColor = "#ffffff";
  }

  if (ui.button(letter, opts).clicked) {
    if (state.status === "playing") {
      ui.cmd("wordle.input", { key: letter });
    }
  }
}
