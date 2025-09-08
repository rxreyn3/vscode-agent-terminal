# TODO / Roadmap

## ~~1) Terminal lifecycle checks~~

- Summary: Reuse the named terminal (profile-specific), but if it has exited, dispose and recreate before sending text. Prevents no-op `sendText` after the shell has terminated (e.g., user typed `exit`).

## ~~2) Multi-root workspace support~~

- Summary: Choose a smarter `cwd` when multiple folders are open or when the active file lies outside a workspace. Adds an `agentterminal.cwdMode` setting to control behavior.

## 3) Command robustness (args)

- Summary: Support structured arguments and proactively check whether the base binary exists on PATH before running. Provides reliable quoting and early, friendly errors.

## ~~4) Status bar action~~

- Summary: Optional status bar button to trigger `agentterminal.run` from anywhere (not just when an editor has focus).

## ~~5) Config schema: terminal name~~

- Summary: Allow customizing the terminal’s name to support multiple Codex terminals (e.g., native vs WSL) and personal preference.

## ~~6) Testing: basic VS Code extension tests~~

- Summary: Integration tests added to validate command registration, terminal lifecycle handling, and cwd resolution using `@vscode/test-electron` + Mocha.
- Scope covered:
  - Verified `agentterminal.run` is registered and callable.
  - Verified terminal recreation after `exitStatus` is set, and that the command sends once on fresh terminal.
  - Verified cwd resolution for `workspaceRoot`, `activeWorkspace`, and `activeFileDir` against a multi-root workspace fixture.
- Changes:
  - New tests in `test/suite/basic.test.js`; existing `quickpick.test.js` retained.
  - Test runner pins VS Code version based on `engines.vscode`.
  - `npm test` runs both unit and integration tests (`test:unit` + `test:integration`).
  - Added fixture file `test-fixtures/B/src/index.txt` for `activeFileDir` testing.
- Acceptance:
  - `npm test` downloads the VS Code version matching `engines.vscode` and runs headlessly.
  - Tests pass locally on macOS/Linux; Windows remains best-effort.

## 7) CI/CD + Publishing (VS Code + Open VSX)

- Summary: Package as a `.vsix` and publish to both the VS Code Marketplace (requires Azure DevOps Marketplace PAT) and Open VSX (separate token). Add CI to build/package on tags.
- Tracks:
  - VS Code Marketplace (vsce): requires a Publisher and an Azure DevOps PAT with scope "Marketplace: Publish". Authenticate via `vsce login <publisher>` or `VSCE_TOKEN` in CI.
  - Open VSX (ovsx): requires an Open VSX account and `OVSX_TOKEN`. Publish via `ovsx publish`.
- Prereqs & manifest hygiene:
  - `package.json`: set `publisher`, `repository`, `bugs`, `homepage`, `license`, `keywords`, `categories`, `icon`.
  - Add `LICENSE` file (e.g., MIT or Apache-2.0) matching `package.json`.
  - Add `.vscodeignore` to exclude dev-only files from the package (e.g., `.vscode/**`, `test/**`, `.github/**`, `**/*.map`, `docs/**`, `*.log`).
  - Ensure `.gitignore` excludes `*.vsix`, `node_modules/`, `.vscode-test/`.
- Tasks (local):
  - Dev deps: `vsce` and `ovsx` (devDependencies) and npm scripts:
    - `vscode:package` → `vsce package`
    - `vscode:publish` → `vsce publish`
    - `ovsx:publish` → `ovsx publish`
  - Package locally with `npx vsce package` and test install via “Install from VSIX…”.
  - Create VS Code Publisher at marketplace.visualstudio.com and generate Azure DevOps PAT (Marketplace: Publish). Run `npx vsce login <publisher>` once.
  - Create Open VSX token and test `npx ovsx publish -p $OVSX_TOKEN`.
- Tasks (CI):
  - Add GitHub Actions workflow triggered on tag `v*`:
    - checkout → setup-node → npm ci → (optional) tests → `npx vsce package` → upload artifact
    - Conditional publish steps if secrets present:
      - `VSCE_TOKEN`: `npx vsce publish` (or `vsce publish -p $VSCE_TOKEN`)
      - `OVSX_TOKEN`: `npx ovsx publish -p $OVSX_TOKEN`
  - Store tokens in repo secrets: `VSCE_TOKEN`, `OVSX_TOKEN`.
- Acceptance criteria:
  - `npx vsce package` produces a `.vsix` locally and installs cleanly.
  - Successful publish to VS Code Marketplace using `vsce` with the configured Publisher.
  - Successful publish to Open VSX using `ovsx`.
  - GitHub Actions builds the `.vsix` on tag and uploads it as an artifact; if tokens are set, it publishes to the respective marketplaces.

## ~~8) TypeScript migration (optional, recommended)~~

- Summary: Migrate to TypeScript for stronger typing, better IntelliSense on the VS Code API, and safer refactors. Common practice in official samples.
- Rationale: Catch errors at compile time, improve contributor experience, align with ecosystem norms. JS is fine for small extensions; TS pays off as features grow.
- Tasks:
  - Dev deps: `typescript`, `@types/node`, and VS Code types matching `engines.vscode` (e.g., `@types/vscode@1.75.x`).
  - Add `tsconfig.json` (CommonJS, target ES2020/ES2021, `strict: true`, `outDir: out`, `rootDir: src`).
  - Move `extension.js` → `src/extension.ts`; add minimal type annotations (`vscode.ExtensionContext`, etc.).
  - Update `package.json`: set `main` to `./out/extension.js`; add scripts `compile` (tsc) and `watch`.
  - Ignore `out/` in `.gitignore`; exclude sources/tests in `.vscodeignore`; ensure compiled output is packaged.
  - Update launch config to build before run or use `tsc -w` during development.
- Acceptance criteria:
  - `npm run compile` outputs `out/extension.js` and F5 runs successfully.
  - Command behavior unchanged; types present for VS Code API.
  - Packaging includes compiled JS and excludes TS sources as desired.
