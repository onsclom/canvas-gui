# Follow-ups (tracked while iterating)

Self-critical list of things to revisit. Mark with `- [x]` when done.

## Round 1: text input + select + windows polish (current pass)

- [x] Text rendering ignores node padding on `textAlign: "left"` — text and caret are drawn at the rect edge, not inset by padding.l
- [x] Key repeat doesn't work (`keysJustPressed` is edge-only). Need a `keysTyped` set that includes browser auto-repeat
- [x] Text input missing: Ctrl+Backspace (delete word), Ctrl+Arrow (move by word)
- [x] Select trigger appends "   ▾" to the text — chevron position drifts with value length. Should be right-aligned via a row+spacer
- [x] Select dropdown options use textAlign:left but inherit button's centered conventions — needs explicit padding handling
- [x] Windows: too much radius everywhere; simplify (squarer title bar / body, sharp inner content)
- [x] Windows: resize handle z-order is wrong, appears clipped or on the wrong layer
- [x] Windows: most recently interacted window should rise to the top of the z-stack

## Known limitations not addressed yet

- [ ] Selection model for text inputs (Shift+Arrow to extend, Ctrl+A to select all)
- [ ] Clipboard integration (Ctrl+C / Ctrl+V / Ctrl+X via navigator.clipboard)
- [ ] Text input doesn't horizontally scroll — long text overflows the container
- [ ] textArea click doesn't position caret precisely (currently only single-line does)
- [ ] Slider's right-edge rounding looks odd at intermediate fillBar values when radius is large
- [ ] No clear "submit" semantic — Enter on text input blurs, no way to bind "on submit"
- [ ] Tab nav skips select options when the dropdown is open (acceptable but worth noting)
- [ ] No undo/redo in text inputs
- [ ] No way to bind hotkeys at the app level the way buttons do (would be nice: `ui.hotkey("Ctrl+S", () => save())`)

## Demos to revisit

- [ ] Kitchen sink should showcase: cursor, modals, windows, text input + area, animations, select, keyboard nav. Currently it predates most of these
