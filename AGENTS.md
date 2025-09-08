# Repository Guidelines

## Project Structure & Module Organization
- `src/extension.ts`: Main entry point (compiled to `out/extension.js`, referenced by `package.json#main`).
- `src/command.ts` → `out/command.js`: Arg quoting helpers.
- `src/windows.ts` → `out/windows.js`: Windows handling (`block`/`wsl`/`native`).
- `src/cwd.ts` → `out/cwd.js`: Workspace cwd resolution helpers.
- `package.json`: VS Code manifest (`contributes`, commands, settings).
- `media/`: Optional profile icons (e.g., `profile-*.svg`). The editor and terminal use the built-in terminal icon by default.
- `.vscode/launch.json`: “Run Extension” config for the Extension Host.
- `.vscodeignore`, `.gitignore`: Packaging and repo hygiene.

### Architecture (Flow)
```
[User Action: editor button / keybinding / status bar]
                      |
                      v
                src/extension.ts
                      |
           +----------+-----------+
           |                      |
       resolveCwd             resolveWindowsCommand
        (src/cwd.ts)             (src/windows.ts)
           |                      |
           +----------+-----------+
                      |
   buildFinalCommand (src/command.ts)
                      |
            VS Code Terminal (create/reuse)
               └─ sendText on first creation only
```

## Build, Test, and Development Commands
- Run (dev): Open in VS Code → Run and Debug → “Run Extension” or press `F5` (preLaunch compiles TypeScript to `out/`).
- Unit tests: `npm test` (runs resolver, command quoting, and Windows handling tests).
- Integration tests: `npm run test:integration` (launches VS Code and exercises QuickPick cwd flow).
- Note (integration tests & sandboxing): Integration tests spawn a VS Code Electron test host. In sandboxed environments (e.g., certain agent runners), this may be blocked (SIGABRT/sandbox errors). Run them locally (outside the sandbox) or grant elevated permissions when prompted.
- Package: `npm i -g @vscode/vsce && vsce package` → creates `agent-terminal-<version>.vsix`.
- Install local: `code --install-extension agent-terminal-*.vsix`.
- Publish (optional): `vsce publish` (requires configured `publisher`).
- Notes: All core modules are in TypeScript. Minimal deps (`shell-quote`, `which`) for quoting and PATH checks.

Notes (tests): Unit/integration tests import from `out/*.js`. The `pretest` script compiles TS before running tests.

## Coding Style & Naming Conventions
- Language: TypeScript for the entry; plain JS allowed for helpers. Two‑space indent, single quotes, semicolons.
- Naming: camelCase for variables/functions; kebab‑case for asset files.
- IDs/Settings: Prefix with `agentterminal.*` (e.g., `agentterminal.run`, `agentterminal.profiles`).
- Structure: Keep the extension minimal; surface errors via `vscode.window.showErrorMessage`.

## Testing Guidelines
- Manual checks:
  - Editor button appears when an editor has focus.
  - Status bar action appears when `agentterminal.showStatusBar` is true; clicking it triggers the same behavior as the editor button.
  - Terminal opens in the editor area using the selected profile’s name and runs its configured command.
  - Terminal is reused when alive and recreated after exit.
  - Launch behavior: terminal gains focus when launching.
- Automated:
  - Unit tests in `test/` (run via `npm test`).
  - VS Code integration test in `test/suite/quickpick.test.js` (run via `npm run test:integration`).

## Functional Constraints
- Do not resend the command when the terminal is already alive. `sendText` is invoked only when creating a new terminal instance. Subsequent invocations focus/reuse the terminal without re-sending.
- Terminal focus: launching focuses the terminal (no “preserve editor focus” option at this time).
- Windows: functionality is sufficient for now (`block` default, with `wsl` and `native` available). No further Windows work is prioritized.

## Commit & Pull Request Guidelines
- Commits: Short, imperative subject; add a brief body when needed (e.g., “Improve README: features, usage, troubleshooting”).
- PRs: Include what/why, testing steps, and any screenshots/GIFs of the editor title button and terminal behavior. Link related issues and update README/settings docs when adding commands or configuration.

## Security & Configuration Tips
- REPLs/agents are configured via profiles (`agentterminal.profiles`). Provide absolute paths when helpful (e.g., `/usr/local/bin/codex`).
- Structured args: put flags/values in the profile `args`; args are quoted per‑platform.
 
- Windows support: `agentterminal.windowsMode` — `block` (default), `wsl` (wraps with `wsl.exe`), `native` (experimental).
- Multi‑root workspaces: control cwd selection with `agentterminal.cwdMode` (`workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt`). In `prompt` mode, `agentterminal.rememberSelection` can persist the last choice per workspace.

## Project Structure & Modules (additions)
- `src/command.ts` → `out/command.js`: Arg quoting helper (`buildFinalCommand`).
- `src/windows.ts` → `out/windows.js`: Windows handling (`block`/`wsl`/`native`) for generic REPL commands.
- `src/cwd.ts` → `out/cwd.js`: CWD resolution modes (`workspaceRoot`, `activeWorkspace`, `activeFileDir`, `prompt`).
- Tests: `test/command.test.js`, `test/windows.test.js`, and integration tests under `test/suite/`.

## Potential Enhancements (for discussion)
- Profiles: named command+args presets selectable via QuickPick (optionally remember last profile per workspace).

## Functional Constraints
- Do not resend the command when the terminal is already alive. `sendText` is invoked only when creating a new terminal instance. Subsequent invocations focus/reuse the terminal without re-sending.
- Terminal focus: launching focuses the terminal.
- Windows: functionality is sufficient for now (`block` default, with `wsl` and `native` available). No further Windows work is prioritized.
