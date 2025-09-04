# Repository Guidelines

## Project Structure & Module Organization
- `extension.js`: Main entry point referenced by `package.json#main`.
- `package.json`: VS Code manifest (`contributes`, commands, settings).
- `media/`: Icons used by the command UI (e.g., `command-icon.svg`).
- `docs/`: Additional documentation (e.g., `codebase_analysis.md`).
- `.vscode/launch.json`: “Run Extension” config for the Extension Host.
- `.vscodeignore`, `.gitignore`: Packaging and repo hygiene.

## Build, Test, and Development Commands
- Run (dev): Open in VS Code → Run and Debug → “Run Extension” or press `F5`.
- Package: `npm i -g @vscode/vsce && vsce package` → creates `codex-cli-button-<version>.vsix`.
- Install local: `code --install-extension codex-cli-button-*.vsix`.
- Publish (optional): `vsce publish` (requires configured `publisher`).
- Notes: Plain JavaScript; no build step or npm scripts at present.

## Coding Style & Naming Conventions
- Language: Plain JS (ES2020+), two‑space indent, single quotes, semicolons.
- Naming: camelCase for variables/functions; kebab‑case for asset files.
- IDs/Settings: Prefix with `codexcli.*` (e.g., `codexcli.run`, `codexcli.command`).
- Structure: Keep the extension minimal; surface errors via `vscode.window.showErrorMessage`.

## Testing Guidelines
- Manual checks:
  - Editor button appears when an editor has focus.
  - Terminal named “Codex CLI” opens in the editor area and runs the configured command.
  - Terminal is reused when alive and recreated after exit.
  - `preserveEditorFocus` behavior: editor keeps focus when launching.
- Automated: Not set up. If added, prefer Mocha + `@vscode/test-electron`; place tests under `test/` and name `*.test.js`.

## Commit & Pull Request Guidelines
- Commits: Short, imperative subject; add a brief body when needed (e.g., “Improve README: features, usage, troubleshooting”).
- PRs: Include what/why, testing steps, and any screenshots/GIFs of the editor title button and terminal behavior. Link related issues and update README/settings docs when adding commands or configuration.

## Security & Configuration Tips
- The command run is user‑configurable (`codexcli.command`). Provide explicit paths when helpful (e.g., `/usr/local/bin/codex --flag`).
- Multi‑root workspaces: control cwd selection with `codexcli.cwdMode` (`workspaceRoot` | `activeWorkspace` | `activeFileDir` | `prompt`). In `prompt` mode, `codexcli.rememberSelection` can persist the last choice per workspace.
