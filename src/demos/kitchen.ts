import * as ui from "../ui";

const TOP_OFFSET = 50;
const CARD_RADIUS = 8;
const BUTTON_RADIUS = 5;
const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";

type FeedItem = { who: string; verb: string; what: string; ago: string };

function genFeed(n: number): FeedItem[] {
  const who = [
    "alice",
    "bob",
    "charlie",
    "dana",
    "eve",
    "frank",
    "grace",
    "harper",
  ];
  const verb = ["pushed", "merged", "opened", "closed", "reviewed", "starred"];
  const what = [
    "feature/widgets",
    "fix/scroll bug",
    "docs/readme",
    "refactor/ui",
    "perf/render",
    "test/wordle",
  ];
  const ago = ["just now", "2m", "10m", "1h", "3h", "yesterday"];
  const items: FeedItem[] = [];
  for (let i = 0; i < n; i++) {
    items.push({
      who: who[i % who.length]!,
      verb: verb[i % verb.length]!,
      what: what[i % what.length]!,
      ago: ago[i % ago.length]!,
    });
  }
  return items;
}

const state = {
  size: 1,
  volume: 0.7,
  detail: 0.5,
  starred: true,
  notifications: false,
  hardcore: false,
  feed: genFeed(40),
  selectedId: -1,
};

ui.onCommand((name, args) => {
  switch (name) {
    case "kitchen.select":
      state.selectedId = args!["id"] as number;
      break;
    case "kitchen.toggle-starred":
      state.starred = !state.starred;
      break;
    case "kitchen.toggle-notifications":
      state.notifications = !state.notifications;
      break;
    case "kitchen.toggle-hardcore":
      state.hardcore = !state.hardcore;
      break;
    case "kitchen.reset":
      state.size = 1;
      state.volume = 0.7;
      state.detail = 0.5;
      state.starred = true;
      state.notifications = false;
      state.hardcore = false;
      state.selectedId = -1;
      break;
  }
});

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  ui.col(
    {
      x: 0,
      y: TOP_OFFSET,
      width: "grow",
      height: "grow",
      padding: 12,
      gap: 12,
    },
    () => {
      // ── header ───────────────────────────────────────────────────────
      ui.row(
        {
          width: "grow",
          padding: 12,
          gap: 12,
          bg: CHROME_BG,
          border: CARD_BORDER,
          radius: CARD_RADIUS,
          align: "center",
        },
        () => {
          ui.withFont("bold 18px system-ui, sans-serif", () => {
            ui.label("Kitchen Sink");
          });
          ui.withTextColor(MUTED, () => {
            ui.label(`fps ${(1000 / dt).toFixed(0)}`);
          });
          ui.spacer({ width: "grow" });
          ui.withTextColor("#fca5a5", () => {
            if (
              ui.button("Reset all", { radius: BUTTON_RADIUS }).clicked
            ) {
              ui.cmd("kitchen.reset");
            }
          });
        },
      );

      // ── main: left showcase scroll + right activity feed scroll ──────
      ui.row({ width: "grow", height: "grow", gap: 12 }, () => {
        leftPanel();
        rightPanel();
      });
    },
  );
}

function leftPanel() {
  ui.col(
    {
      id: "left-scroll",
      width: "grow",
      height: "grow",
      padding: 12,
      gap: 12,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "stretch",
      scrollable: true,
    },
    () => {
      sectionHeader("Buttons");
      ui.row({ gap: 8, align: "center" }, () => {
        ui.button("Default", { radius: BUTTON_RADIUS });
        ui.button("Pill", { radius: 100, height: 30 });
        ui.button("Square", { radius: 0 });
        ui.withTextColor("#fca5a5", () => {
          ui.button("Destructive", { radius: BUTTON_RADIUS });
        });
        ui.button("Custom", {
          bg: "#2563eb",
          textColor: "#dbeafe",
          radius: BUTTON_RADIUS,
        });
      });

      divider();

      sectionHeader("Toggles");
      ui.row({ gap: 8 }, () => {
        if (
          ui.toggle(state.starred ? "★ Starred" : "☆ Star", state.starred, {
            id: "k-star",
            width: 110,
            radius: BUTTON_RADIUS,
          }).clicked
        ) {
          ui.cmd("kitchen.toggle-starred");
        }
        if (
          ui.toggle(
            state.notifications ? "Notifications On" : "Notifications Off",
            state.notifications,
            { id: "k-notif", width: 170, radius: BUTTON_RADIUS },
          ).clicked
        ) {
          ui.cmd("kitchen.toggle-notifications");
        }
        if (
          ui.toggle(
            state.hardcore ? "Hardcore" : "Casual",
            state.hardcore,
            { id: "k-hc", width: 100, radius: BUTTON_RADIUS },
          ).clicked
        ) {
          ui.cmd("kitchen.toggle-hardcore");
        }
      });

      divider();

      sectionHeader("Sliders");
      state.size = ui.slider("Size", state.size, 0.5, 3, {
        radius: BUTTON_RADIUS,
      }).value;
      state.volume = ui.slider("Volume", state.volume, 0, 1, {
        radius: BUTTON_RADIUS,
      }).value;
      state.detail = ui.slider("Detail", state.detail, 0, 1, {
        radius: BUTTON_RADIUS,
      }).value;

      divider();

      sectionHeader("Typography");
      ui.withFont("bold 22px system-ui, sans-serif", () => {
        ui.label("Display heading");
      });
      ui.withFont("bold 16px system-ui, sans-serif", () => {
        ui.label("Section heading");
      });
      ui.label("Default body text using the inherited font.");
      ui.withTextColor(MUTED, () => {
        ui.label("Muted secondary text for descriptions.");
      });
      ui.withFont("13px ui-monospace, monospace", () => {
        ui.label("const fn = () => 'monospace label';");
      });

      divider();

      sectionHeader("Layout primitives");
      // justify
      ui.row(
        {
          width: "grow",
          height: 38,
          padding: 6,
          gap: 6,
          bg: CHROME_BG,
          radius: 6,
          justify: "between",
          align: "center",
        },
        () => {
          ui.label("justify: between");
          ui.button("A", { width: 32, radius: BUTTON_RADIUS });
          ui.button("B", { width: 32, radius: BUTTON_RADIUS });
        },
      );
      // grow sharing
      ui.row(
        {
          width: "grow",
          height: 38,
          padding: 6,
          gap: 6,
          bg: CHROME_BG,
          radius: 6,
          align: "center",
        },
        () => {
          ui.label("grow");
          ui.spacer({ width: 8 });
          ui.button("One", { width: "grow", radius: BUTTON_RADIUS });
          ui.button("Two", { width: "grow", radius: BUTTON_RADIUS });
          ui.button("Three", { width: "grow", radius: BUTTON_RADIUS });
        },
      );

      divider();

      sectionHeader("Cards & colors");
      ui.row({ width: "grow", gap: 8 }, () => {
        const colors = [
          ["#dc2626", "Error"],
          ["#d97706", "Warn"],
          ["#16a34a", "Ok"],
          ["#2563eb", "Info"],
        ];
        for (const [c, lab] of colors) {
          ui.col(
            {
              width: "grow",
              height: 70,
              padding: 8,
              bg: c,
              radius: 6,
              align: "stretch",
              justify: "center",
            },
            () => {
              ui.withTextColor("#fff", () => {
                ui.withFont("bold 13px system-ui, sans-serif", () => {
                  ui.label(lab!);
                });
                ui.withFont("11px system-ui, sans-serif", () => {
                  ui.label("status card");
                });
              });
            },
          );
        }
      });

      divider();

      sectionHeader("Nested scroll");
      ui.label("This inner list scrolls independently:");
      ui.col(
        {
          id: "inner-scroll",
          width: "grow",
          height: 160,
          padding: 6,
          gap: 4,
          bg: CHROME_BG,
          border: CARD_BORDER,
          radius: 6,
          scrollable: true,
          align: "stretch",
        },
        () => {
          for (let i = 0; i < 20; i++) {
            ui.withHeight(28, () => {
              ui.row(
                {
                  width: "grow",
                  padding: 6,
                  align: "center",
                  bg: i % 2 === 0 ? "rgba(255,255,255,0.02)" : undefined,
                  radius: 4,
                },
                () => {
                  ui.label(`Item ${i + 1}`);
                  ui.spacer({ width: "grow" });
                  ui.withTextColor(MUTED, () => {
                    ui.label("#" + (1000 + i));
                  });
                },
              );
            });
          }
        },
      );

      divider();

      sectionHeader("More content");
      for (let i = 0; i < 6; i++) {
        ui.row(
          {
            width: "grow",
            padding: 10,
            bg: CHROME_BG,
            border: CARD_BORDER,
            radius: 6,
            align: "center",
            gap: 10,
          },
          () => {
            ui.col({ gap: 2 }, () => {
              ui.withFont("bold 13px system-ui, sans-serif", () => {
                ui.label(`Filler card ${i + 1}`);
              });
              ui.withTextColor(MUTED, () => {
                ui.label("Just here so you have something to scroll past.");
              });
            });
            ui.spacer({ width: "grow" });
            ui.button("Open", { radius: BUTTON_RADIUS });
          },
        );
      }

      // big spacer at end so we can scroll past everything
      ui.spacer({ height: 12 });
    },
  );
}

function rightPanel() {
  ui.col(
    {
      width: 300,
      height: "grow",
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "stretch",
    },
    () => {
      // sticky header (non-scrollable above the scroll region)
      ui.row(
        {
          width: "grow",
          padding: 12,
          align: "center",
        },
        () => {
          ui.withFont("bold 13px system-ui, sans-serif", () => {
            ui.label("Activity");
          });
          ui.spacer({ width: "grow" });
          ui.withTextColor(MUTED, () => {
            ui.label(`${state.feed.length} events`);
          });
        },
      );

      // scrollable feed
      ui.col(
        {
          id: "feed-scroll",
          width: "grow",
          height: "grow",
          padding: 8,
          gap: 4,
          scrollable: true,
          align: "stretch",
        },
        () => {
          for (let i = 0; i < state.feed.length; i++) {
            const it = state.feed[i]!;
            const selected = state.selectedId === i;
            const c = ui.row(
              {
                id: `feed-${i}`,
                width: "grow",
                padding: 8,
                gap: 8,
                bg: selected ? "rgba(74,222,128,0.12)" : CHROME_BG,
                border: selected
                  ? "rgba(74,222,128,0.5)"
                  : "rgba(255,255,255,0.04)",
                radius: 6,
                clickable: true,
                align: "center",
              },
              () => {
                ui.node({
                  width: 26,
                  height: 26,
                  bg: avatarColor(it.who),
                  radius: 13,
                  text: it.who[0]!.toUpperCase(),
                  textColor: "#fff",
                  textAlign: "center",
                  font: "bold 12px system-ui, sans-serif",
                });
                ui.col({ gap: 2, width: "grow" }, () => {
                  ui.withFont("13px system-ui, sans-serif", () => {
                    ui.label(`${it.who} ${it.verb}`);
                  });
                  ui.withTextColor(MUTED, () => {
                    ui.withFont("11px ui-monospace, monospace", () => {
                      ui.label(it.what);
                    });
                  });
                });
                ui.withTextColor(MUTED, () => {
                  ui.withFont("11px system-ui, sans-serif", () => {
                    ui.label(it.ago);
                  });
                });
              },
            );
            if (c.clicked) ui.cmd("kitchen.select", { id: i });
          }
        },
      );
    },
  );
}

function avatarColor(name: string): string {
  const palette = [
    "#dc2626",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#0891b2",
    "#2563eb",
    "#7c3aed",
    "#db2777",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length]!;
}

function sectionHeader(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont("bold 11px system-ui, sans-serif", () => {
      ui.label(text.toUpperCase());
    });
  });
}

function divider() {
  ui.node({
    width: "grow",
    height: 1,
    bg: "rgba(255,255,255,0.06)",
  });
}
