import { keysJustPressed } from "../input";
import * as ui from "../ui";

// === constants ===
const CARD_RADIUS = 8;
const BUTTON_RADIUS = 5;
const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";

const MIN_NOTE = 48; // C3 in MIDI
const NOTE_COUNT = 24; // → up to B4 (one note shy of C5; matches the original)
const START_INDEX = 12; // C4 relative to MIN_NOTE
const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
const INTERVAL_NAMES = [
  "P1",
  "m2",
  "M2",
  "m3",
  "M3",
  "P4",
  "TT",
  "P5",
  "m6",
  "M6",
  "m7",
  "M7",
  "P8",
  "m9",
  "M9",
];

type Mode = "Metronome" | "MIDI";
type Note = { name: string; num: number; freq: number };

const state = {
  mode: "Metronome" as Mode,
  notesPerMinute: 45,
  midiDelay: 500,
  intervals: new Set<number>([1, 2, 3, 4, 5, 6, 7]),
  running: false,
  currentNote: null as Note | null,
  stats: { correct: 0, incorrect: 0 },
  midiDevices: 0,
  midiSupported: true,
  noteFlash: 0, // 0..1, decays each frame; pulses the note card on play
  beat: 0, // counts notes played since start (visual tempo bar)
};

// === audio ===

let audioCtx: AudioContext | null = null;
let activeNoteCleanup: (() => void) | null = null;
let metronomeInterval: ReturnType<typeof setInterval> | null = null;
let metronomeIntervalMs = 0;
let midiNextNoteTimeout: ReturnType<typeof setTimeout> | null = null;
let midiFirstTry = true;
let lastIndex = START_INDEX;

function ensureAudio(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playFreq(freq: number) {
  const ac = ensureAudio();
  if (activeNoteCleanup) activeNoteCleanup();
  const osc = ac.createOscillator();
  osc.frequency.value = freq;
  osc.type = "triangle";
  const gain = ac.createGain();
  const duration = 0.6;
  gain.gain.setValueAtTime(0.5, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
  const cleanup = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {}
  };
  activeNoteCleanup = cleanup;
  setTimeout(cleanup, duration * 1000 + 50);
}

function noteAt(midi: number): Note {
  return {
    name: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`,
    num: midi,
    freq: 440 * Math.pow(2, (midi - 69) / 12),
  };
}

function pickNextNoteIndex(): number {
  const allowed = state.intervals;
  if (allowed.size === 0) return lastIndex;
  // try up to 200 random indices to find one whose interval is allowed
  for (let i = 0; i < 200; i++) {
    const candidate = Math.floor(Math.random() * NOTE_COUNT);
    if (allowed.has(Math.abs(candidate - lastIndex))) return candidate;
  }
  return lastIndex;
}

function playCurrentNote() {
  if (!state.currentNote) return;
  playFreq(state.currentNote.freq);
  state.noteFlash = 1;
  state.beat++;
}

function metronomeTick() {
  lastIndex = pickNextNoteIndex();
  state.currentNote = noteAt(MIN_NOTE + lastIndex);
  playCurrentNote();
}

function syncMetronomeRate() {
  const target = 60000 / state.notesPerMinute;
  if (Math.abs(metronomeIntervalMs - target) > 1 && metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = setInterval(metronomeTick, target);
    metronomeIntervalMs = target;
  }
}

function startMetronome() {
  lastIndex = START_INDEX;
  state.currentNote = noteAt(MIN_NOTE + START_INDEX);
  state.beat = 0;
  playCurrentNote();
  const ms = 60000 / state.notesPerMinute;
  metronomeIntervalMs = ms;
  metronomeInterval = setInterval(metronomeTick, ms);
}

function startMidi() {
  lastIndex = START_INDEX;
  state.currentNote = noteAt(MIN_NOTE + START_INDEX);
  state.beat = 0;
  playCurrentNote();
  midiFirstTry = true;
}

function handleMidiNote(noteNum: number) {
  if (!state.running || state.mode !== "MIDI" || !state.currentNote) return;
  if (noteNum === state.currentNote.num) {
    if (midiFirstTry) state.stats.correct++;
    if (midiNextNoteTimeout) clearTimeout(midiNextNoteTimeout);
    midiNextNoteTimeout = setTimeout(() => {
      if (!state.running) return;
      lastIndex = pickNextNoteIndex();
      state.currentNote = noteAt(MIN_NOTE + lastIndex);
      playCurrentNote();
      midiFirstTry = true;
    }, state.midiDelay);
  } else {
    if (midiFirstTry) {
      midiFirstTry = false;
      state.stats.incorrect++;
    }
  }
}

function stopAll() {
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
    metronomeIntervalMs = 0;
  }
  if (midiNextNoteTimeout) {
    clearTimeout(midiNextNoteTimeout);
    midiNextNoteTimeout = null;
  }
  if (activeNoteCleanup) {
    activeNoteCleanup();
    activeNoteCleanup = null;
  }
  state.running = false;
  state.currentNote = null;
}

// === MIDI device setup ===

let midiAccess: MIDIAccess | null = null;

function updateMidiDevices() {
  if (!midiAccess) return;
  let count = 0;
  midiAccess.inputs.forEach((input) => {
    count++;
    input.onmidimessage = (e) => {
      if (!e.data) return;
      const command = e.data[0] ?? 0;
      const note = e.data[1] ?? 0;
      const velocity = e.data[2] ?? 0;
      if (command === 144 && velocity > 0) {
        ui.cmd("melody.midi-note", { note });
      }
    };
  });
  state.midiDevices = count;
}

if (
  typeof navigator !== "undefined" &&
  (navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> })
    .requestMIDIAccess
) {
  (navigator as Navigator & { requestMIDIAccess: () => Promise<MIDIAccess> })
    .requestMIDIAccess()
    .then((access) => {
      midiAccess = access;
      updateMidiDevices();
      access.onstatechange = updateMidiDevices;
    })
    .catch(() => {
      state.midiSupported = false;
    });
} else {
  state.midiSupported = false;
}

// === commands ===

ui.onCommand((name, args) => {
  switch (name) {
    case "melody.set-mode":
      stopAll();
      state.mode = args!["mode"] as Mode;
      break;
    case "melody.toggle-interval": {
      const i = args!["i"] as number;
      if (state.intervals.has(i)) state.intervals.delete(i);
      else state.intervals.add(i);
      break;
    }
    case "melody.preset": {
      const p = args!["name"] as string;
      switch (p) {
        case "none":
          state.intervals.clear();
          break;
        case "steps":
          state.intervals = new Set([1, 2]);
          break;
        case "default":
          state.intervals = new Set([1, 2, 3, 4, 5, 6, 7]);
          break;
        case "major":
          state.intervals = new Set([0, 2, 4, 5, 7, 9, 11, 12]);
          break;
        case "all":
          state.intervals = new Set(Array.from({ length: 15 }, (_, i) => i));
          break;
      }
      break;
    }
    case "melody.start":
      if (state.running) break;
      if (state.intervals.size === 0) break;
      state.running = true;
      if (state.mode === "Metronome") startMetronome();
      else startMidi();
      break;
    case "melody.stop":
      stopAll();
      break;
    case "melody.reset-stats":
      state.stats = { correct: 0, incorrect: 0 };
      break;
    case "melody.midi-note":
      handleMidiNote(args!["note"] as number);
      break;
  }
});

// === UI ===

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  // visual decay for note pulse
  state.noteFlash = Math.max(0, state.noteFlash - dt / 700);
  // keep the metronome rate in sync with the slider while running
  if (state.running && state.mode === "Metronome") syncMetronomeRate();
  // space toggles start/stop
  if (keysJustPressed.has(" ")) {
    if (state.intervals.size > 0) {
      ui.cmd(state.running ? "melody.stop" : "melody.start");
    }
  }

  ui.col(
    {
      id: "melody-scroll",
      x: 0,
      y: 50,
      width: "grow",
      height: "grow",
      padding: 16,
      gap: 14,
      align: "center",
      scrollable: true,
    },
    () => {
      // centered narrow card column
      ui.col({ width: 600, gap: 14, align: "stretch" }, () => {
        // ── title ─────────────────────────────────────────────────
        ui.row({ width: "grow", align: "center", gap: 12 }, () => {
          ui.withFont("bold 26px system-ui, sans-serif", () => {
            ui.label("Melody Metronome");
          });
          ui.spacer({ width: "grow" });
          beatVisualizer();
        });

        // ── tabs ──────────────────────────────────────────────────
        ui.row({ width: "grow", gap: 6 }, () => {
          for (const m of ["Metronome", "MIDI"] as const) {
            const isActive = state.mode === m;
            if (isActive) {
              ui.toggle(m, true, {
                id: `tab-${m}`,
                width: "grow",
                height: 38,
                radius: BUTTON_RADIUS,
              });
            } else {
              if (
                ui.button(m, {
                  id: `tab-${m}`,
                  width: "grow",
                  height: 38,
                  radius: BUTTON_RADIUS,
                }).clicked
              ) {
                ui.cmd("melody.set-mode", { mode: m });
              }
            }
          }
        });

        if (state.mode === "Metronome") metronomeContent();
        else midiContent();

        // keyboard shortcut hint
        ui.withTextColor(MUTED, () => {
          ui.withFont("11px system-ui, sans-serif", () => {
            ui.label("Tip: press space to start / stop.", {
              width: "grow",
              textAlign: "center",
            });
          });
        });
      });

      ui.spacer({ height: 8 });
    },
  );
}

function metronomeContent() {
  ui.col(
    {
      width: "grow",
      padding: 16,
      gap: 12,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "stretch",
    },
    () => {
      sectionLabel("Notes per minute");
      state.notesPerMinute = ui.slider("", state.notesPerMinute, 15, 100, {
        id: "bpm",
        width: "grow",
        height: 32,
        radius: BUTTON_RADIUS,
        precision: 0,
        step: 1,
      }).value;

      sectionLabel("Allowed intervals (in semitones)");
      intervalGrid();
      presetRow();
    },
  );

  hint("First note is always C4. Notes stay between C3 and B4.");
  startStopButton();
  noteDisplay("Now playing");
}

function midiContent() {
  // device status banner
  ui.row(
    {
      width: "grow",
      padding: 10,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "center",
      justify: "center",
      gap: 8,
    },
    () => {
      if (!state.midiSupported) {
        ui.withTextColor("#fca5a5", () => {
          ui.label("✗ Web MIDI not supported in this browser");
        });
      } else if (state.midiDevices > 0) {
        ui.withTextColor("#86efac", () => {
          ui.label(
            `✓ ${state.midiDevices} MIDI device${state.midiDevices === 1 ? "" : "s"} detected`,
          );
        });
      } else {
        ui.withTextColor("#fca5a5", () => {
          ui.label("✗ No MIDI device detected");
        });
      }
    },
  );

  ui.col(
    {
      width: "grow",
      padding: 16,
      gap: 12,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "stretch",
    },
    () => {
      sectionLabel("Delay after correct answer");
      state.midiDelay = ui.slider("", state.midiDelay, 0, 1500, {
        id: "midi-delay",
        width: "grow",
        height: 32,
        radius: BUTTON_RADIUS,
        precision: 0,
        step: 50,
        suffix: " ms",
      }).value;

      sectionLabel("Allowed intervals (in semitones)");
      intervalGrid();
      presetRow();
    },
  );

  hint("First note is always C4. Notes stay between C3 and B4.");
  startStopButton();
  noteDisplay("Target note");
  statsCard();
}

function sectionLabel(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont("bold 11px system-ui, sans-serif", () => {
      ui.label(text.toUpperCase());
    });
  });
}

function hint(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont("12px system-ui, sans-serif", () => {
      ui.label(text, { width: "grow", wrap: true, textAlign: "center" });
    });
  });
}

function intervalGrid() {
  ui.col({ width: "grow", gap: 4, align: "stretch" }, () => {
    ui.row({ width: "grow", gap: 4 }, () => {
      for (let i = 0; i < 15; i++) {
        const active = state.intervals.has(i);
        if (active) {
          if (
            ui.toggle(`${i}`, true, {
              id: `int-${i}`,
              width: "grow",
              height: 36,
              radius: 4,
            }).clicked
          ) {
            ui.cmd("melody.toggle-interval", { i });
          }
        } else {
          if (
            ui.button(`${i}`, {
              id: `int-${i}`,
              width: "grow",
              height: 36,
              radius: 4,
            }).clicked
          ) {
            ui.cmd("melody.toggle-interval", { i });
          }
        }
      }
    });
    // names row
    ui.row({ width: "grow", gap: 4 }, () => {
      ui.withFont("9px system-ui, sans-serif", () => {
        ui.withTextColor(MUTED, () => {
          for (let i = 0; i < 15; i++) {
            ui.label(INTERVAL_NAMES[i]!, {
              width: "grow",
              textAlign: "center",
            });
          }
        });
      });
    });
  });
}

function presetRow() {
  const presets: [string, string][] = [
    ["None", "none"],
    ["Steps", "steps"],
    ["Default", "default"],
    ["Major", "major"],
    ["All", "all"],
  ];
  ui.row({ width: "grow", gap: 4 }, () => {
    for (const [label, key] of presets) {
      if (
        ui.button(label, {
          id: `preset-${key}`,
          width: "grow",
          height: 28,
          radius: 4,
          font: "12px system-ui, sans-serif",
        }).clicked
      ) {
        ui.cmd("melody.preset", { name: key });
      }
    }
  });
}

function startStopButton() {
  const disabled = state.intervals.size === 0;
  if (disabled) {
    ui.node({
      width: "grow",
      height: 56,
      bg: "#374151",
      text: "Pick at least one interval",
      textAlign: "center",
      textColor: MUTED,
      font: "bold 16px system-ui, sans-serif",
      radius: 8,
    });
    return;
  }
  const text = state.running ? "Stop" : "Start";
  const bg = state.running ? "#dc2626" : "#16a34a";
  if (
    ui.button(text, {
      id: "start-stop",
      width: "grow",
      height: 56,
      bg,
      textColor: "#fff",
      font: "bold 20px system-ui, sans-serif",
      radius: 8,
    }).clicked
  ) {
    if (state.running) ui.cmd("melody.stop");
    else ui.cmd("melody.start");
  }
}

function noteDisplay(label: string) {
  const flash = state.noteFlash;
  // greener bg while the note is fresh
  const flashAlpha = (flash * 0.32).toFixed(3);
  const bg =
    flash > 0 ? `rgba(74,222,128,${flashAlpha})` : CARD_BG;
  const borderColor =
    flash > 0
      ? `rgba(74,222,128,${(0.2 + flash * 0.5).toFixed(3)})`
      : CARD_BORDER;

  ui.col(
    {
      width: "grow",
      padding: 14,
      bg,
      border: borderColor,
      radius: CARD_RADIUS,
      align: "stretch",
      gap: 10,
    },
    () => {
      ui.row({ width: "grow", align: "center" }, () => {
        ui.withTextColor(MUTED, () => {
          ui.withFont("bold 10px system-ui, sans-serif", () => {
            ui.label(label.toUpperCase());
          });
        });
        ui.spacer({ width: "grow" });
        if (state.currentNote) {
          ui.withTextColor(MUTED, () => {
            ui.withFont("11px ui-monospace, monospace", () => {
              ui.label(`midi ${state.currentNote!.num}`);
            });
          });
        }
      });
      // big note name centered
      ui.row({ width: "grow", justify: "center", align: "center" }, () => {
        if (state.currentNote) {
          ui.withFont("bold 44px system-ui, sans-serif", () => {
            ui.label(state.currentNote!.name);
          });
        } else {
          ui.withTextColor(MUTED, () => {
            ui.withFont("bold 32px system-ui, sans-serif", () => {
              ui.label(state.running ? "…" : "press start");
            });
          });
        }
      });
      // chromatic strip — 24 semitones from C3 to B4
      chromaticStrip();
    },
  );
}

function chromaticStrip() {
  ui.col({ width: "grow", gap: 3, align: "stretch" }, () => {
    ui.row({ width: "grow", gap: 2, height: 32, align: "stretch" }, () => {
      for (let i = 0; i < 24; i++) {
        const midi = MIN_NOTE + i;
        const noteInOctave = midi % 12;
        const isBlackKey = [1, 3, 6, 8, 10].includes(noteInOctave);
        const isC = noteInOctave === 0;
        const isCurrent = state.currentNote?.num === midi;
        let bg: string;
        if (isCurrent) bg = "#4ade80";
        else if (isBlackKey) bg = "#0b0f17";
        else if (isC) bg = "#475569";
        else bg = "#374151";
        ui.node({
          width: "grow",
          height: "grow",
          bg,
          radius: 2,
        });
      }
    });
    // octave markers
    ui.row({ width: "grow", gap: 2 }, () => {
      ui.withTextColor(MUTED, () => {
        ui.withFont("9px ui-monospace, monospace", () => {
          for (let i = 0; i < 24; i++) {
            const midi = MIN_NOTE + i;
            const isC = midi % 12 === 0;
            ui.label(isC ? `C${Math.floor(midi / 12) - 1}` : " ", {
              width: "grow",
              textAlign: "center",
            });
          }
        });
      });
    });
  });
}

function statsCard() {
  ui.row({ width: "grow", gap: 8, align: "stretch" }, () => {
    statBox("Correct", state.stats.correct.toString(), "#86efac");
    statBox("Incorrect", state.stats.incorrect.toString(), "#fca5a5");
    const total = state.stats.correct + state.stats.incorrect;
    statBox(
      "Accuracy",
      total === 0
        ? "—"
        : `${Math.round((100 * state.stats.correct) / total)}%`,
      "#bef264",
    );
  });
  ui.withTextColor("#fca5a5", () => {
    if (
      ui.button("Reset stats", {
        id: "reset-stats",
        width: "grow",
        radius: BUTTON_RADIUS,
        height: 32,
      }).clicked
    ) {
      ui.cmd("melody.reset-stats");
    }
  });
}

function statBox(label: string, value: string, valueColor: string) {
  ui.col(
    {
      width: "grow",
      padding: 10,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: 6,
      align: "center",
      gap: 4,
    },
    () => {
      ui.withTextColor(MUTED, () => {
        ui.withFont("bold 10px system-ui, sans-serif", () => {
          ui.label(label.toUpperCase());
        });
      });
      ui.withTextColor(valueColor, () => {
        ui.withFont("bold 22px ui-monospace, monospace", () => {
          ui.label(value);
        });
      });
    },
  );
}

// small dot grid that pulses with the beat
function beatVisualizer() {
  ui.row({ gap: 4, align: "center" }, () => {
    for (let i = 0; i < 4; i++) {
      const phase = (state.beat - i + 4) % 4;
      const lit = state.running && phase === 0;
      // recent dots stay slightly lit
      const recency = state.running ? Math.max(0, 1 - phase * 0.3) : 0;
      const alpha = lit ? 0.9 : 0.15 + recency * 0.4;
      ui.node({
        width: 10,
        height: 10,
        radius: 5,
        bg: `rgba(74,222,128,${alpha.toFixed(3)})`,
      });
    }
  });
}
