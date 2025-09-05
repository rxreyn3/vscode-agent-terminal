# Repository Guidelines

## Agent Operating Rules
- Clarify before coding: If a prompt has open questions or ambiguity, ask Ryan specific questions and wait for answers before implementing.
- Confirm intent to implement: When a request doesn’t clearly ask to start building, confirm whether to proceed before making changes.
- TDD by default: Practice test‑driven development. Start with a failing test (or update tests to fail), implement the minimal change to pass, then refactor.
- Update docs after changes: After any meaningful change, review and update relevant docs (README, docs/, and this AGENTS.md) to reflect new behavior or settings.
- Be proactive and critical: Assume Ryan may not have all constraints in mind. Suggest simpler or safer approaches, call out risks, and recommend small, reviewable steps.
- Guiding principles: KISS, FOK (Focus on the key), YAGNI, DRY, SRP.
- Addressing: Address the user as “Ryan” in messages.
- Message style: Use Markdown icons/emoji to aid scannability when appropriate (e.g., ✅, ⚠️, 💡).
- Visual aids: Use ASCII diagrams in code blocks for system designs, data flows, sequences, or flow charts when they help communication.

## Project Structure & Module Organization
- `extension.js`: Main entry point referenced by `package.json#main`.
- `package.json`: VS Code manifest (`contributes`, commands, settings).
- `media/`: Icons used by the command UI (e.g., `command-icon.svg`).
- `docs/`: Additional documentation (e.g., `codebase_analysis.md`).
- `.vscode/launch.json`: “Run Extension” config for the Extension Host.
- `.vscodeignore`, `.gitignore`: Packaging and repo hygiene.

## Build, Test, and Development Commands
- Run (dev): Open in VS Code → Run and Debug → “Run Extension” or press `F5`.
- Unit tests: `npm test` (runs resolver, command quoting/precheck, and Windows handling tests).
- Integration tests: `npm run test:integration` (launches VS Code and exercises QuickPick cwd flow).
- Package: `npm i -g @vscode/vsce && vsce package` → creates `codex-cli-button-<version>.vsix`.
- Install local: `code --install-extension codex-cli-button-*.vsix`.
- Publish (optional): `vsce publish` (requires configured `publisher`).
- Notes: Plain JavaScript; minimal deps (`shell-quote`, `which`) for quoting and PATH checks.

## Coding Style & Naming Conventions
- Language: Plain JS (ES2020+), two‑space indent, single quotes, semicolons.
- Naming: camelCase for variables/functions; kebab‑case for asset files.
- IDs/Settings: Prefix with `codexcli.*` (e.g., `codexcli.run`, `codexcli.command`).
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

## Commit & Pull Request Guidelines
- Commits: Short, imperative subject; add a brief body when needed (e.g., “Improve README: features, usage, troubleshooting”).
- PRs: Include what/why, testing steps, and any screenshots/GIFs of the editor title button and terminal behavior. Link related issues and update README/settings docs when adding commands or configuration.

## Security & Configuration Tips
- The command is configurable (`codexcli.command`). Provide absolute paths when helpful (e.g., `/usr/local/bin/codex`).
- Structured args: prefer `codexcli.args` over embedding quoting in `command`; args are quoted per‑platform.
- PATH precheck: `codexcli.precheckBinary` (default `true`) surfaces a friendly “Command not found” if the base binary isn’t found. Disable if your shell PATH differs from the extension host.
- Windows support: `codexcli.windowsMode` — `block` (default), `wsl` (runs `wsl.exe codex ...`), `native` (experimental).
- Multi‑root workspaces: control cwd selection with `codexcli.cwdMode` (`workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt`). In `prompt` mode, `codexcli.rememberSelection` can persist the last choice per workspace.

## Project Structure & Modules (additions)
- `src/command.js`: Arg quoting and PATH precheck helpers (`buildFinalCommand`, `precheckBinary`).
- `src/windows.js`: Windows handling (`block`/`wsl`/`native`) for `codex` invocation.
- `test/command.test.js`: Unit tests for quoting and precheck.
- `test/windows.test.js`: Unit tests for Windows command resolution.
