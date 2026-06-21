// Chat app — message list pinned to the bottom (scrollToBottom), a textarea
// input that grows with its content, timestamps, and a canned bot reply. A
// "jump to latest" pill appears when you scroll up (scrollState.atBottom).
import * as ui from "canvas-gui";

type Msg = { from: "me" | "bot"; text: string; t: string };

const REPLIES = [
  "Got it 👍",
  "Interesting — tell me more.",
  "That makes sense.",
  "Drawn on a <canvas>, by the way.",
  "Try scrolling up — a jump-to-latest pill appears.",
  "The input below grows as you type more lines.",
  "Everything here is immediate-mode UI.",
];

const state = {
  msgs: [
    { from: "bot", text: "Hey! This whole chat is one canvas.", t: clock() },
    { from: "bot", text: "Type below and hit Send. Shift isn't needed — Send posts.", t: clock() },
  ] as Msg[],
  draft: "",
  pending: null as { text: string; at: number } | null,
  replyN: 0,
};

function clock() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function send() {
  const t = state.draft.trim();
  if (!t) return;
  state.msgs.push({ from: "me", text: t, t: clock() });
  state.draft = "";
  state.pending = { text: REPLIES[state.replyN++ % REPLIES.length]!, at: performance.now() + 650 };
  ui.scrollToBottom("chat-log");
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  // deliver the queued bot reply
  if (state.pending && performance.now() >= state.pending.at) {
    state.msgs.push({ from: "bot", text: state.pending.text, t: clock() });
    state.pending = null;
    ui.scrollToBottom("chat-log");
  }

  // centered chat column
  const colW = Math.min(560, w - 32);
  ui.col(
    { x: (w - colW) / 2, y: 60, width: colW, height: h - 80, gap: 0, align: "stretch" },
    () => {
      // header
      ui.row(
        {
          width: "grow",
          padding: 12,
          gap: 10,
          bg: "#111827",
          border: "rgba(255,255,255,0.07)",
          radius: 10,
          align: "center",
        },
        () => {
          ui.node({ width: 34, height: 34, radius: 17, bg: "#4ade80", text: "B", textColor: "#052e16", textAlign: "center", font: "bold 15px system-ui" });
          ui.col({ gap: 1 }, () => {
            ui.text("Bot", "h3");
            ui.withTextColor("#4ade80", () => ui.text(state.pending ? "typing…" : "online", "caption"));
          });
          ui.spacer({ width: "grow" });
          ui.text(`${state.msgs.length} msgs`, "caption");
        },
      );

      ui.spacer({ height: 8 });

      // message log (sticky bottom)
      ui.col(
        {
          id: "chat-log",
          width: "grow",
          height: "grow",
          padding: 10,
          gap: 8,
          scrollable: true,
          align: "stretch",
        },
        () => {
          for (let i = 0; i < state.msgs.length; i++) bubble(state.msgs[i]!, i);
          if (state.pending) typingBubble();
        },
      );

      // jump-to-latest pill when scrolled up
      const sc = ui.scrollState("chat-log");
      if (!sc.atBottom && sc.maxY > 0) {
        if (
          ui.button("↓ Latest", {
            id: "chat-latest",
            x: (w + colW) / 2 - 96,
            y: h - 150,
            width: 80,
            height: 28,
            radius: 14,
            bg: "accent",
            textColor: "#052e16",
            font: "bold 12px system-ui",
          }).clicked
        ) {
          ui.scrollToBottom("chat-log");
        }
      }

      ui.spacer({ height: 8 });

      // growing input + send
      const lines = Math.max(1, state.draft.split("\n").length);
      const inputH = Math.min(120, 24 + lines * 18);
      ui.row({ width: "grow", gap: 8, align: "end" }, () => {
        state.draft = ui.textArea(state.draft, {
          id: "chat-input",
          width: "grow",
          height: inputH,
          placeholder: "Message…  (grows as you type)",
          radius: 10,
        }).value;
        if (
          ui.button("Send", {
            id: "chat-send",
            width: 76,
            height: 40,
            radius: 10,
            bg: "accent",
            textColor: "#052e16",
            font: "bold 14px system-ui",
            disabled: state.draft.trim().length === 0,
          }).clicked
        ) {
          send();
        }
      });
    },
  );
}

function bubble(m: Msg, i: number) {
  const me = m.from === "me";
  ui.row({ width: "grow", justify: me ? "end" : "start" }, () => {
    if (me) ui.spacer({ width: "grow" });
    ui.col(
      {
        id: `msg-${i}`,
        width: "fit",
        padding: { l: 12, r: 12, t: 8, b: 6 },
        gap: 2,
        bg: me ? "#2563eb" : "#1f2937",
        radius: 12,
        align: "stretch",
      },
      () => {
        ui.withTextColor(me ? "#eff6ff" : "#e5e7eb", () =>
          ui.label(m.text, { wrap: true, width: 360 }),
        );
        ui.withTextColor(me ? "rgba(255,255,255,0.6)" : "#9ca3af", () =>
          ui.withFont("10px system-ui", () => ui.label(m.t, { textAlign: me ? "left" : "left" })),
        );
      },
    );
    if (!me) ui.spacer({ width: "grow" });
  });
}

function typingBubble() {
  ui.row({ width: "grow", justify: "start" }, () => {
    ui.col(
      { padding: { l: 14, r: 14, t: 10, b: 10 }, bg: "#1f2937", radius: 12 },
      () => ui.withTextColor("#9ca3af", () => ui.label("• • •")),
    );
    ui.spacer({ width: "grow" });
  });
}
