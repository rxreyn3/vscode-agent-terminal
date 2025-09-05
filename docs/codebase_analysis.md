**Project Overview**
- **Project type:** VS Code extension (editor command + toolbar button)
- **Purpose:** Adds an editor title button that opens a terminal in the editor area and runs a configurable Codex CLI command.
- **Tech stack:** JavaScript (VS Code Extension Host API)
- **Architecture:** Command/handler pattern; terminal lifecycle management; multi-root cwd resolution; optional status bar action; Windows command resolution; minimal state persisted in `workspaceState`.
- **Languages:** JavaScript; VS Code API target `^1.75.0`.

**Directory Structure**
- **Root (`.`):** Core extension sources and metadata
  - `package.json`: Manifest (activation, contributes, configs, menus, keybindings, icons)
  - `extension.js`: Main module (activation, command registration, terminal + cwd logic)
  - `README.md`: Features, usage, settings
  - `.gitignore`, `LICENSE`
- **`src/`:** Internal helpers
  - `cwd.js`: CWD resolver for multi-root strategies and prompt selection
  - `command.js`: Arg quoting (`buildFinalCommand`) and PATH precheck (`precheckBinary`)
  - `windows.js`: Windows command resolution (`block`, `wsl`, `native`)
- **`.vscode/`:** Local development config
  - `launch.json`: “Run Extension” launch config
- **`media/`:** Assets
  - `command-icon.svg`: Command icon
  - `icon-256.png`: Gallery icon
- **`test/`:** Tests
  - `cwd.test.js`: Unit tests for cwd resolver
  - `command.test.js`: Unit tests for quoting and PATH precheck
  - `windows.test.js`: Unit tests for Windows handling
  - `runTest.js`: VS Code test bootstrap
  - `suite/index.js`, `suite/quickpick.test.js`: Integration test for QuickPick flow
- **`test-fixtures/`:** Test workspace data
  - `multi-root.code-workspace`, `A/`, `B/`

**File-By-File Breakdown**
- `extension.js`: Registers `codexcli.run`. Reads config (`command`, `args`, `precheckBinary`, `windowsMode`, `preserveEditorFocus`, `cwdMode`, `rememberSelection`), computes `cwd` via `resolveCwd`, optionally prompts via QuickPick, persists selection (when enabled), reuses/creates terminal named "Codex CLI" in editor area, builds final command via `buildFinalCommand` (with optional Windows adaptation), and runs it. Disposes exited terminals before recreating. Also hosts an optional status bar item when enabled.
- `src/cwd.js`: Pure resolver for cwd selection strategies. Supports `workspaceRoot`, `activeWorkspace`, `activeFileDir`, `prompt` (with remember). Handles non-file URIs and fallbacks.
- `src/command.js`: Provides `buildFinalCommand` (platform-aware arg quoting) and `precheckBinary` (which/where or fs existence for path-like base).
- `src/windows.js`: Decides Windows behavior: `block` (error), `wsl` (wrap with `wsl.exe`), or `native` (pass-through).
- `package.json`: Configuration schema includes `codexcli.command`, `codexcli.args`, `codexcli.precheckBinary`, `codexcli.windowsMode`, `codexcli.preserveEditorFocus`, `codexcli.cwdMode`, `codexcli.rememberSelection`, and `codexcli.showStatusBar`. Activation includes `onStartupFinished` to initialize the status bar item.

**API/Command Surface**
- **Command:** `codexcli.run`
  - Shown in editor title bar (when `editorTextFocus`), Command Palette, and bound to `cmd+shift+.` by default.
  - Behavior: Opens/reuses terminal "Codex CLI" in editor area, selects cwd via mode, preserves editor focus optionally, sends configured command to shell.
- **Configuration:**
  - `codexcli.command: string` — command to execute (default `codex`).
  - `codexcli.args: string[]` — optional arguments appended and quoted appropriately.
  - `codexcli.precheckBinary: boolean` — best-effort PATH precheck for the base command.
  - `codexcli.preserveEditorFocus: boolean` — keep editor focus on show (default `true`).
  - `codexcli.cwdMode: string` — `workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt` (default `workspaceRoot`).
  - `codexcli.rememberSelection: boolean` — reuse last selection in `prompt` mode (default `true`).
  - `codexcli.windowsMode: string` — `block` (default), `wsl`, `native` (experimental).
  - `codexcli.showStatusBar: boolean` — show a status bar action to trigger `codexcli.run`.

**Testing**
- Unit: `npm test` runs `test/cwd.test.js`, `test/command.test.js`, and `test/windows.test.js`.
- Integration: `npm run test:integration` launches VS Code, stubs QuickPick + terminal, and asserts cwd selection in `prompt` mode.

**Environment & Setup**
- Open folder in VS Code, press F5 to run the Extension Development Host.
- Requires VS Code 1.75+ and a command available at `codexcli.command`.

**Key Insights**
- Terminal reuse/dispose is handled; editor focus is preserved by default.
- Multi-root cwd selection implemented with robust fallbacks and optional persistence.
- Platform-aware arg quoting and PATH precheck improve robustness.
- Windows support is gated with explicit modes; WSL wrapping is available.
- Optional status bar action enables running without editor focus.

**Summary**
Focused, single-purpose extension with multi-root cwd selection and terminal lifecycle handling. Tests validate core behaviors; ready for packaging and CI if desired.
