**Project Overview**
- **Project type:** VS Code extension (editor command + toolbar button)
- **Purpose:** Adds an editor title button that opens a terminal in the editor area and runs a configurable Codex CLI command.
- **Tech stack:** JavaScript (VS Code Extension Host API)
- **Architecture:** Command/handler pattern; terminal lifecycle management; multi-root cwd resolution; minimal state persisted in `workspaceState`.
- **Languages:** JavaScript; VS Code API target `^1.75.0`.

**Directory Structure**
- **Root (`.`):** Core extension sources and metadata
  - `package.json`: Manifest (activation, contributes, configs, menus, keybindings, icons)
  - `extension.js`: Main module (activation, command registration, terminal + cwd logic)
  - `README.md`: Features, usage, settings
  - `.gitignore`, `LICENSE`
- **`src/`:** Internal helpers
  - `cwd.js`: CWD resolver for multi-root strategies and prompt selection
- **`.vscode/`:** Local development config
  - `launch.json`: “Run Extension” launch config
- **`media/`:** Assets
  - `command-icon.svg`: Command icon
  - `icon-256.png`: Gallery icon
- **`test/`:** Tests
  - `cwd.test.js`: Unit tests for cwd resolver
  - `runTest.js`: VS Code test bootstrap
  - `suite/index.js`, `suite/quickpick.test.js`: Integration test for QuickPick flow
- **`test-fixtures/`:** Test workspace data
  - `multi-root.code-workspace`, `A/`, `B/`

**File-By-File Breakdown**
- `extension.js`: Registers `codexcli.run`. Reads config (`command`, `preserveEditorFocus`, `cwdMode`, `rememberSelection`), computes `cwd` via `resolveCwd`, optionally prompts via QuickPick, persists selection (when enabled), reuses/creates terminal named "Codex CLI" in editor area, and runs the command. Disposes exited terminals before recreating.
- `src/cwd.js`: Pure resolver for cwd selection strategies. Supports `workspaceRoot`, `activeWorkspace`, `activeFileDir`, `prompt` (with remember). Handles non-file URIs and fallbacks.
- `package.json`: Adds configuration schema for `codexcli.cwdMode` and `codexcli.rememberSelection` in addition to existing settings.

**API/Command Surface**
- **Command:** `codexcli.run`
  - Shown in editor title bar (when `editorTextFocus`), Command Palette, and bound to `cmd+shift+.` by default.
  - Behavior: Opens/reuses terminal "Codex CLI" in editor area, selects cwd via mode, preserves editor focus optionally, sends configured command to shell.
- **Configuration:**
  - `codexcli.command: string` — command to execute (default `codex`).
  - `codexcli.preserveEditorFocus: boolean` — keep editor focus on show (default `true`).
  - `codexcli.cwdMode: string` — `workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt` (default `workspaceRoot`).
  - `codexcli.rememberSelection: boolean` — reuse last selection in `prompt` mode (default `true`).

**Testing**
- Unit: `npm test` runs `test/cwd.test.js` for resolver modes and fallbacks.
- Integration: `npm run test:integration` launches VS Code, stubs QuickPick + terminal, and asserts cwd selection in `prompt` mode.

**Environment & Setup**
- Open folder in VS Code, press F5 to run the Extension Development Host.
- Requires VS Code 1.75+ and a command available at `codexcli.command`.

**Key Insights**
- Terminal reuse/dispose is handled; editor focus is preserved by default.
- Multi-root cwd selection implemented with robust fallbacks and optional persistence.
- Tests cover both pure resolver logic and an interactive QuickPick path.

**Summary**
Focused, single-purpose extension with multi-root cwd selection and terminal lifecycle handling. Tests validate core behaviors; ready for packaging and CI if desired.

