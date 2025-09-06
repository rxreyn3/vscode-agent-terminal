# Repository Guidelines

## Agent Operating Rules
- Clarify before coding: If a prompt has open questions or ambiguity, ask Ryan specific questions and wait for answers before implementing.
- Confirm intent to implement: When a request doesn’t clearly ask to start building, confirm whether to proceed before making changes.
- TDD by default: Practice test‑driven development. Start with a failing test (or update tests to fail), implement the minimal change to pass, then refactor.
- Update docs after changes: After any meaningful change, review and update relevant docs (README and this AGENTS.md) to reflect new behavior or settings.
- Be proactive and critical: Assume Ryan may not have all constraints in mind. Suggest simpler or safer approaches, call out risks, and recommend small, reviewable steps.
- Guiding principles: KISS, FOK (Focus on the key), YAGNI, DRY, SRP.
- Addressing: Address the user as “Ryan” in messages.
- Message style: Use Markdown icons/emoji to aid scannability when appropriate (e.g., ✅, ⚠️, 💡).
- Visual aids: Use ASCII diagrams in code blocks for system designs, data flows, sequences, or flow charts when they help communication.

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
- Package: `npm i -g @vscode/vsce && vsce package` → creates `codex-cli-button-<version>.vsix`.
- Install local: `code --install-extension codex-cli-button-*.vsix`.
- Publish (optional): `vsce publish` (requires configured `publisher`).
- Notes: All core modules are in TypeScript. Minimal deps (`shell-quote`, `which`) for quoting and PATH checks.

Notes (tests): Unit/integration tests import from `out/*.js`. The `pretest` script compiles TS before running tests.

## Coding Style & Naming Conventions
- Language: TypeScript for the entry; plain JS allowed for helpers. Two‑space indent, single quotes, semicolons.
- Naming: camelCase for variables/functions; kebab‑case for asset files.
- IDs/Settings: Prefix with `replrunner.*` (e.g., `replrunner.run`, `replrunner.profiles`).
- Structure: Keep the extension minimal; surface errors via `vscode.window.showErrorMessage`.

## Testing Guidelines
- Manual checks:
  - Editor button appears when an editor has focus.
  - Status bar action appears when `codexcli.showStatusBar` is true; clicking it triggers the same behavior as the editor button.
  - Terminal named “Codex CLI” opens in the editor area and runs the configured command.
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
- REPLs are configured via profiles (`replrunner.profiles`). Provide absolute paths when helpful (e.g., `/usr/local/bin/codex`).
- Structured args: put flags/values in the profile `args`; args are quoted per‑platform.
 
- Windows support: `replrunner.windowsMode` — `block` (default), `wsl` (wraps with `wsl.exe`), `native` (experimental).
- Multi‑root workspaces: control cwd selection with `replrunner.cwdMode` (`workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt`). In `prompt` mode, `replrunner.rememberSelection` can persist the last choice per workspace.

## Project Structure & Modules (additions)
- `src/command.ts` → `out/command.js`: Arg quoting helper (`buildFinalCommand`).
- `src/windows.ts` → `out/windows.js`: Windows handling (`block`/`wsl`/`native`) for `codex` invocation.
- `src/cwd.ts` → `out/cwd.js`: CWD resolution modes (`workspaceRoot`, `activeWorkspace`, `activeFileDir`, `prompt`).
- Tests: `test/command.test.js`, `test/windows.test.js`, and integration tests under `test/suite/`.

## Potential Enhancements (for discussion)
- Profiles: named command+args presets selectable via QuickPick (optionally remember last profile per workspace).

## Functional Constraints
- Do not resend the command when the terminal is already alive. `sendText` is invoked only when creating a new terminal instance. Subsequent invocations focus/reuse the terminal without re-sending.
- Terminal focus: launching focuses the terminal.
- Windows: functionality is sufficient for now (`block` default, with `wsl` and `native` available). No further Windows work is prioritized.
