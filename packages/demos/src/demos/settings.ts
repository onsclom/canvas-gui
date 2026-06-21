// Settings page — exercises the rounded-out widget set: tabs, segmented,
// checkbox, radioGroup, numberInput, progress, slider, select, tooltip, and
// the live theme (the accent picker calls ui.setTheme).
import * as ui from "canvas-gui";

type Tab = "General" | "Appearance" | "Notifications" | "Account";
const ACCENTS = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa"];

const state = {
  tab: "General" as Tab,
  // general
  workspace: "Acme Inc",
  language: "English" as "English" | "Español" | "Deutsch" | "日本語",
  autosave: true,
  telemetry: false,
  syncEvery: 5,
  // appearance
  accent: "#4ade80",
  density: "Comfortable" as "Compact" | "Comfortable" | "Spacious",
  radius: 8,
  fontScale: 14,
  // notifications
  email: true,
  push: true,
  sms: false,
  volume: 0.6,
  digest: "Daily" as "Off" | "Daily" | "Weekly",
  // account
  name: "Ada Lovelace",
  plan: "Pro" as "Free" | "Pro" | "Team",
};

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  // the accent picker drives the global theme live
  ui.setTheme({ accent: state.accent });

  const colW = Math.min(620, w - 32);
  ui.col(
    { x: (w - colW) / 2, y: 60, width: colW, height: h - 80, gap: 14, align: "stretch" },
    () => {
      ui.text("Settings", "h1");
      state.tab = ui.tabs(state.tab, ["General", "Appearance", "Notifications", "Account"], {
        id: "set-tabs",
      }).value as Tab;

      ui.col(
        {
          id: "set-panel",
          width: "grow",
          height: "grow",
          bg: "#111827",
          border: "rgba(255,255,255,0.07)",
          radius: 12,
          padding: 20,
          gap: 16,
          align: "stretch",
          scrollable: true,
        },
        () => panel(),
      );
    },
  );
}

function field(label: string, control: () => void, hint?: string) {
  ui.row({ width: "grow", align: "center", gap: 14 }, () => {
    ui.col({ width: 180, gap: 1 }, () => {
      ui.text(label, "body");
      if (hint) ui.text(hint, "caption");
    });
    ui.col({ width: "grow", align: "stretch" }, control);
  });
}

function panel() {
  if (state.tab === "General") {
    ui.text("Workspace", "caption");
    field("Name", () => {
      state.workspace = ui.textInput(state.workspace, { id: "set-ws", width: "grow" }).value;
    });
    field("Language", () => {
      state.language = ui.select(state.language, ["English", "Español", "Deutsch", "日本語"], {
        id: "set-lang",
        width: 200,
      }).value;
    });
    divider();
    ui.text("Behavior", "caption");
    field("Autosave", () => {
      state.autosave = ui.checkbox("Save changes automatically", state.autosave, { id: "set-auto" }).value;
    });
    field("Telemetry", () => {
      state.telemetry = ui.checkbox("Share anonymous usage data", state.telemetry, { id: "set-tel" }).value;
    });
    field("Sync interval", () => {
      ui.row({ gap: 10, align: "center" }, () => {
        state.syncEvery = ui.numberInput(state.syncEvery, { id: "set-sync", min: 1, max: 60 }).value;
        ui.text("minutes", "caption");
      });
    }, "how often to sync");
  } else if (state.tab === "Appearance") {
    ui.text("Theme", "caption");
    field("Accent", () => {
      ui.row({ gap: 8, align: "center" }, () => {
        for (const a of ACCENTS) {
          const sel = state.accent === a;
          const c = ui.button("", {
            id: `acc-${a}`,
            width: 26,
            height: 26,
            radius: 13,
            bg: a,
            border: sel ? "#ffffff" : "rgba(255,255,255,0.2)",
          });
          if (c.clicked) state.accent = a;
          ui.tooltip(c, a);
        }
      });
    }, "drives ui.setTheme");
    field("Density", () => {
      state.density = ui.radioGroup(state.density, ["Compact", "Comfortable", "Spacious"], {
        id: "set-dens",
        dir: "row",
      }).value;
    });
    field("Corner radius", () => {
      state.radius = Math.round(ui.slider("", state.radius, 0, 20, { id: "set-rad", width: "grow", height: 26, precision: 0 }).value);
    });
    field("Font scale", () => {
      state.fontScale = ui.numberInput(state.fontScale, { id: "set-font", min: 10, max: 22 }).value;
    });
    divider();
    ui.text("Preview", "caption");
    ui.row({ gap: 10, align: "center" }, () => {
      ui.button("Primary", { id: "pv-1", bg: "accent", textColor: theme().accentFg, radius: state.radius, height: 34, width: 120 });
      ui.button("Secondary", { id: "pv-2", radius: state.radius, height: 34, width: 120 });
      ui.toggle("Toggle", true, { id: "pv-3", radius: state.radius, height: 34, width: 100 });
    });
  } else if (state.tab === "Notifications") {
    ui.text("Channels", "caption");
    field("Email", () => {
      state.email = ui.checkbox("Send to ada@acme.io", state.email, { id: "n-email" }).value;
    });
    field("Push", () => {
      state.push = ui.checkbox("Browser & mobile push", state.push, { id: "n-push" }).value;
    });
    field("SMS", () => {
      state.sms = ui.checkbox("Text messages", state.sms, { id: "n-sms" }).value;
    });
    divider();
    field("Digest", () => {
      state.digest = ui.segmented(state.digest, ["Off", "Daily", "Weekly"], { id: "n-digest" }).value;
    });
    field("Volume", () => {
      state.volume = ui.slider("", state.volume, 0, 1, { id: "n-vol", width: "grow", height: 26, precision: 2 }).value;
    });
    field("Quota used", () => ui.progress(0.42, { fillColor: "#fbbf24" }), "42% of monthly alerts");
  } else {
    ui.text("Profile", "caption");
    field("Name", () => {
      state.name = ui.textInput(state.name, { id: "a-name", width: "grow" }).value;
    });
    field("Plan", () => {
      state.plan = ui.segmented(state.plan, ["Free", "Pro", "Team"], { id: "a-plan" }).value;
    });
    field("Storage", () => ui.progress(0.71, {}), "71% of 50 GB");
    divider();
    ui.row({ gap: 10 }, () => {
      ui.button("Save changes", { id: "a-save", bg: "accent", textColor: theme().accentFg, radius: 6, height: 36, width: 140 });
      ui.withTextColor("#fca5a5", () => ui.button("Delete account", { id: "a-del", radius: 6, height: 36, width: 140 }));
    });
  }
}

function theme() {
  return ui.theme;
}
function divider() {
  ui.node({ width: "grow", height: 1, bg: "rgba(255,255,255,0.07)" });
}
