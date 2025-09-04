Codex CLI Button (VS Code / Windsurf)

Adds a small toolbar button in the editor title area that opens a terminal in the editor and launches `codex`.

Usage

- Open this folder in Windsurf/VS Code.
- Run the "Run Extension" launch config (F5) to start a new Extension Development Host.
- In the new window, open any file. A rocket icon appears at the top‑right of the editor.
- Click it to create an editor‑area terminal and run `codex`.

Notes

- Uses the first workspace folder as `cwd` when available.
- Reuses a terminal named "Codex CLI" if it already exists.
- Default keybinding: `Cmd+Shift+.` (macOS). Change it in Keyboard Shortcuts if desired.

Icon

- Customized ChatGPT swirl with a tiny CLI prompt badge (">_") in the bottom‑right to differentiate from other extensions.
- Monochrome via `currentColor` to match light/dark themes.
- Files: `media/icon-light.svg`, `media/icon-dark.svg`.
