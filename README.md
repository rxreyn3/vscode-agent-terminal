Codex CLI Button
================

A tiny VS Code extension that adds an editor title button to launch Codex in a terminal inside the editor area.

What it does
- Adds a "Run Codex CLI" rocket button in the editor title bar.
- Opens (or reuses) an editor‑area terminal named "Codex CLI" and runs a configurable command (default: `codex`).
- Keeps editor focus by default so you can keep typing while Codex runs.
- Handles closed shells gracefully: if the terminal has exited, it is recreated automatically on the next run.

Requirements
- VS Code 1.75+ (engines.vscode ^1.75.0).
- Codex CLI installed and available on your PATH (or set an absolute path via settings).

Install / Run (development)
1) Open this folder in VS Code.
2) Press F5 (Run Extension) to launch an Extension Development Host.
3) Open any file in the Dev Host window. A rocket icon appears at the top‑right of the editor.
4) Click the button (or use the command palette) to open the terminal and run Codex.

Usage
- Editor title button: click the rocket in the top‑right when an editor has focus.
- Command Palette: "Codex: Run Codex CLI" (command id: `codexcli.run`).
- Keybinding: `Cmd+Shift+.` (macOS). Customize in Keyboard Shortcuts to suit your OS.

Settings
- `codexcli.command` (string, default: `"codex"`)
  - Command to execute in the terminal. Example: `codex --model gpt-5`.
- `codexcli.preserveEditorFocus` (boolean, default: `true`)
  - Show the terminal but keep focus in the editor.

Behavior notes
- Workspace folder: uses the first workspace folder as `cwd` if present; otherwise VS Code’s default terminal location.
- Terminal reuse: reuses the terminal named "Codex CLI" when alive; recreates it automatically if the shell exited (e.g., after typing `exit`).

Troubleshooting
- "command not found": Ensure Codex is installed and on your PATH, or set `codexcli.command` to an absolute path.
- No toolbar button: The button only shows when an editor has focus and the extension is active (invoke the command once if needed).

Roadmap (high level)
- Smarter cwd selection for multi‑root workspaces.
- Optional status bar action (toggleable).
- Structured args + optional PATH precheck.

Contributing
- Open issues/PRs are welcome. The code is intentionally minimal and written in plain JavaScript for easy hacking.

License
- MIT — see `LICENSE`.
