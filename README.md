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
- Platform support:
  - macOS and Linux: officially supported.
  - Windows: experimental. Prefer running Codex inside WSL.
    - Set `codexcli.command` to `wsl.exe codex` or set `codexcli.windowsMode` to `"wsl"` to auto-wrap.
    - Default behavior is `codexcli.windowsMode: "block"` which shows an error and suggests WSL.

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
- `codexcli.windowsMode` (string, default: `"block"`)
  - Windows handling for Codex CLI. `block`: show an error (recommended). `wsl`: invoke via `wsl.exe` (runs Linux codex inside WSL). `native`: run as-is (experimental; not officially supported).
- `codexcli.args` (string[], default: `[]`)
  - Optional list of arguments appended after `codexcli.command`. Each argument is quoted appropriately for your platform.
- `codexcli.precheckBinary` (boolean, default: `true`)
  - Best-effort check that the base command exists on PATH (or that an absolute path exists) before running. Shows a friendly error and does not send the command when missing.
- `codexcli.showStatusBar` (boolean, default: `false`)
  - Show a status bar action (right side) labeled "$(rocket) Codex" that runs `codexcli.run` from anywhere.
- `codexcli.preserveEditorFocus` (boolean, default: `true`)
  - Show the terminal but keep focus in the editor.
- `codexcli.cwdMode` (string, default: `"workspaceRoot"`)
  - How to choose the working directory:
    - `workspaceRoot`: use the first workspace folder (default).
    - `activeWorkspace`: use the workspace containing the active editor’s file.
    - `activeFileDir`: use the directory of the active file.
    - `prompt`: when multiple folders are open, prompt to pick one (optionally remembered).
- `codexcli.rememberSelection` (boolean, default: `true`)
  - In `prompt` mode, remember the last selected folder and reuse it next time.

Behavior notes
- Workspace folder: chooses `cwd` per `codexcli.cwdMode`. Without a workspace, the terminal launches in the shell’s default location.
- Terminal reuse: reuses the terminal named "Codex CLI" when alive; recreates it automatically if the shell exited (e.g., after typing `exit`).
 - Args assembly: the final command sent is `<codexcli.command> <quoted args...>` with quoting rules suited to your OS. Prefer `codexcli.args` over embedding complex quoting in `codexcli.command`.
 - PATH precheck: the extension host’s PATH can differ from your terminal’s PATH (especially on macOS). The precheck is an early warning only; if it reports missing but you know it exists in your shell, you can disable the check by setting `codexcli.precheckBinary` to `false`.
 - Windows: the extension can auto-wrap Codex with WSL (`wsl.exe codex ...`) when `codexcli.windowsMode` is set to `wsl`. Native Windows support is experimental per Codex docs.
 - Status bar: when enabled via `codexcli.showStatusBar`, the button appears on startup and updates live when toggling the setting.

Troubleshooting
- "command not found": Ensure Codex is installed and on your PATH, or set `codexcli.command` to an absolute path.
- No toolbar button: The button only shows when an editor has focus and the extension is active (invoke the command once if needed).

Roadmap (high level)
- Smarter cwd selection for multi‑root workspaces — done.
- Optional status bar action (toggleable) — done.
- Structured args + optional PATH precheck — done.

Contributing
- Open issues/PRs are welcome. The code is intentionally minimal and written in plain JavaScript for easy hacking.

License
- MIT — see `LICENSE`.
