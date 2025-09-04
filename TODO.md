# TODO / Roadmap

## ~~1) Terminal lifecycle checks~~

- Summary: Reuse the named terminal ("Codex CLI"), but if it has exited, dispose and recreate before sending text. Prevents no-op `sendText` after the shell has terminated (e.g., user typed `exit`).
- Tasks:
  - Find existing terminal by name.
  - If `terminal.exitStatus !== undefined`, call `terminal.dispose()` and set `term = undefined`.
  - Create a new terminal when missing, preserving `cwd` and editor-area `location`.
  - Call `term.show(preserveFocus)` and `term.sendText(command, true)`.
- Acceptance criteria:
  - Invoking "Run Codex CLI" after the terminal has exited creates a fresh terminal and executes the configured command successfully.
  - When the terminal is still alive, subsequent invocations reuse the same terminal without creating duplicates.
  - Editor focus behavior follows `codexcli.preserveEditorFocus`.
- Sketch:
  ```js
  let term = vscode.window.terminals.find(t => t.name === 'Codex CLI');
  if (term && term.exitStatus !== undefined) {
    term.dispose();
    term = undefined;
  }
  if (!term) {
    term = vscode.window.createTerminal({
      name: 'Codex CLI',
      cwd,
      location: { viewColumn: vscode.ViewColumn.Active },
    });
  }
  term.show(preserveFocus);
  term.sendText(command, true);
  ```
- Notes:
  - `exitStatus` is set when the shell process exits; attempting to send text will not revive it. Disposal and recreation ensure a valid shell.
  - Keep the terminal name stable to support reuse and predictable behavior.

## 2) Multi-root workspace support

- Summary: Choose a smarter `cwd` when multiple folders are open or when the active file lies outside a workspace. Adds a `codexcli.cwdMode` setting to control behavior.
- Modes (`codexcli.cwdMode`):
  - `workspaceRoot` (default): Use the first workspace folder (current behavior).
  - `activeWorkspace`: Use the workspace folder that contains the active editor’s document; fallback to first folder.
  - `activeFileDir`: Use the directory of the active file (when available); fallback to first folder.
  - `prompt`: If multiple folders are open, prompt the user to pick; optionally remember last selection.
- Settings additions:
  - `codexcli.cwdMode: string` enum of the modes above (with descriptions).
  - `codexcli.rememberSelection: boolean` (default `true`) to reuse last chosen folder when `prompt`.
- Tasks:
  - Read `cwdMode` and compute `cwd` via the chosen strategy with a robust fallback chain.
  - Implement QuickPick for `prompt` mode; store last selection in `context.workspaceState` when `rememberSelection` is true.
  - Handle untitled documents, no active editor, and zero workspace folders.
  - Guard against non-file URIs by checking `uri.scheme === 'file'` before using `fsPath`/`path.dirname`.
  - Document behavior and settings in README.
- Acceptance criteria:
  - Single-folder workspace, default `workspaceRoot`: behavior unchanged.
  - Multi-root with `activeWorkspace`: running from a file in Folder B sets `cwd` to Folder B root.
  - `prompt` mode with 2+ folders: shows a picker; chosen folder becomes `cwd`; with `rememberSelection`, a subsequent run reuses the selection without prompting.
  - `activeFileDir` mode: sets `cwd` to the active file’s directory when possible; falls back to first workspace folder; if none, `cwd` is undefined and terminal launches in default shell location.
- Sketch:
  ```js
  const cfg = vscode.workspace.getConfiguration('codexcli');
  const mode = cfg.get('cwdMode', 'workspaceRoot');
  const editor = vscode.window.activeTextEditor;
  const folders = vscode.workspace.workspaceFolders || [];
  let cwd;

  switch (mode) {
    case 'activeWorkspace': {
      const uri = editor?.document?.uri;
      const ws = uri && vscode.workspace.getWorkspaceFolder(uri);
      cwd = ws?.uri?.fsPath || folders[0]?.uri?.fsPath;
      break;
    }
    case 'activeFileDir': {
      const uri = editor?.document?.uri;
      const fsPath = uri?.scheme === 'file' ? uri.fsPath : undefined;
      cwd = fsPath ? require('path').dirname(fsPath) : folders[0]?.uri?.fsPath;
      break;
    }
    case 'prompt': {
      // Show QuickPick of folders; persist selection with workspaceState if allowed
      // (Implement using vscode.window.showQuickPick and context.workspaceState)
      break;
    }
    default: {
      cwd = folders[0]?.uri?.fsPath;
    }
  }
  ```
- Notes:
  - Respect remote workspaces: `fsPath` is only valid for `file:` URIs.
  - `prompt` mode UX: display folder names, include full path detail, and handle cancel gracefully.

## 3) Command robustness (args + PATH precheck)

- Summary: Support structured arguments and proactively check whether the base binary exists on PATH before running. Provides reliable quoting and early, friendly errors.
- Settings additions:
  - `codexcli.args: string[]` — optional list of arguments appended after `codexcli.command`.
  - `codexcli.precheckBinary: boolean` (default `true`) — verify the binary is available before sending to terminal.
- Behavior:
  - Build the final command as: `<command> <quoted args...>`.
  - Quote args per platform:
    - POSIX shells: wrap with single quotes; escape embedded single quotes (`'` -> `'\''`).
    - Windows: wrap with double quotes; escape embedded quotes (`"`). Note PowerShell vs cmd differences (document caveat).
  - Precheck: attempt to resolve the base binary before running; if missing, show `showErrorMessage` with guidance and do not send text to terminal.
- Tasks:
  - Read `args` and `precheckBinary` from configuration.
  - Implement `quoteArg(arg, isWindows)` helper.
  - Compute `finalCommand` by joining `command` and each quoted arg with spaces.
  - Implement precheck:
    - Extract base binary from `command` (first token before space).
    - Use `child_process.spawnSync` with `{ shell: true }` calling `which` (POSIX) or `where` (Windows), or try spawning the binary with `--version`.
    - If not found, `showErrorMessage` explaining how to fix PATH or to provide an absolute path; return early.
  - Back-compat: if no `args`, behave exactly as today.
- Acceptance criteria:
  - With `args` containing spaces/quotes, command executes correctly on POSIX and Windows.
  - When `precheckBinary` is enabled and the binary is missing, a clear error appears and no command is sent to the terminal.
  - When `precheckBinary` is disabled, behavior matches current implementation (terminal runs whatever is typed).
  - Existing users with only `codexcli.command` continue to work unchanged.
- Sketch:
  ```js
  const isWin = process.platform === 'win32';
  const quote = (s) => isWin ? `"${s.replace(/"/g, '\\"')}"` : `'${s.replace(/'/g, `'\''`)}'`;
  const commandBase = cfg.get('command', 'codex');
  const args = cfg.get('args', []);
  const precheck = cfg.get('precheckBinary', true);

  // Best-effort precheck
  if (precheck) {
    const base = commandBase.split(/\s+/)[0];
    const check = isWin ? `where ${base}` : `which ${base}`;
    const { spawnSync } = require('child_process');
    const res = spawnSync(check, { shell: true });
    if (res.status !== 0) {
      vscode.window.showErrorMessage(
        `Command not found: ${base}. Add it to PATH or set an absolute path in codexcli.command.`
      );
      return;
    }
  }

  const final = [commandBase, ...args.map(quote)].join(' ');
  term.sendText(final, true);
  ```
- Notes:
  - Extension host PATH can differ from the integrated terminal shell PATH (macOS in particular). Treat precheck as a helpful early warning, not a guarantee.
  - Document quoting limitations for PowerShell vs cmd; encourage users to prefer `args` over embedding complex quoting into `command`.

## 4) Status bar action

- Summary: Optional status bar button to trigger `codexcli.run` from anywhere (not just when an editor has focus).
- Setting:
  - `codexcli.showStatusBar: boolean` (default `false`) — when true, show a right-side status bar item labeled "Codex" with the extension icon.
- Behavior:
  - Clicking the item executes the same command as the editor title button (`codexcli.run`).
  - Status bar item is created on `activate()` if enabled, and disposed when disabled.
  - Reacts to configuration changes at runtime.
- Tasks:
  - Add config property in `package.json` under `contributes.configuration`.
  - In `activate`, read setting and create a `StatusBarItem` with `alignment: Right`, `text: "$(rocket) Codex"` (or icon), `command: 'codexcli.run'`.
  - Listen for `workspace.onDidChangeConfiguration` and toggle visibility accordingly.
  - Dispose the item in `context.subscriptions`.
- Acceptance criteria:
  - When `codexcli.showStatusBar` is true, the status bar item appears and triggers `codexcli.run` on click.
  - Toggling the setting takes effect without reloading the window.
  - No status bar item when the setting is false (default).

## 5) Config schema: terminal name

- Summary: Allow customizing the terminal’s name to support multiple Codex terminals (e.g., native vs WSL) and personal preference.
- Setting addition:
  - `codexcli.terminalName: string` (default `"Codex CLI"`) — label used when finding/creating the terminal.
- Behavior:
  - Search for an existing terminal matching `terminalName` and reuse it; otherwise create a new one with that name.
  - Changing the setting does not rename existing terminals; new runs will create/reuse by the new name.
- Tasks:
  - Add config property in `package.json` under `contributes.configuration` with description.
  - Read `terminalName` in the command handler; replace hardcoded occurrences.
  - Optional: If a terminal exists with the old default name and the user changes the setting, allow both terminals to coexist (no forced rename) to keep behavior predictable.
- Acceptance criteria:
  - Default behavior unchanged (still uses "Codex CLI").
  - When `codexcli.terminalName` is set, newly created terminal labels reflect the value and reuse works by that name without creating duplicates.
  - No regressions to preserve focus, cwd selection, or status bar behavior.

## 6) Testing: basic VS Code extension tests

- Summary: Add minimal integration tests to validate command registration, terminal lifecycle handling, and cwd resolution using `@vscode/test-electron` (vscode-test) + Mocha.
- Scope:
  - Test that `codexcli.run` is registered and callable.
  - Test terminal reuse and recreation after exit (`exitStatus` handling).
  - Test multi-root cwd resolution for each `cwdMode` (mock workspace or use fixture folders).
- Tasks:
  - Add dev dependencies: `@vscode/test-electron`, `mocha`, `chai` (or Node assert).
  - Create `src/test/suite/extension.test.js` with tests that activate the extension and call the command.
  - Add `scripts.test` to `package.json` to run the tests via `vscode-test` download + launch.
  - Provide a minimal test workspace under `test-fixtures/` (single and multi-root) for cwd tests.
- Acceptance criteria:
  - `pnpm test`/`npm test` downloads the correct VS Code version and runs tests headlessly.
  - All tests pass locally on macOS/Linux; Windows runs are best-effort due to platform nuances.
  - CI-ready with a future GitHub Actions job.

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

## 8) TypeScript migration (optional, recommended)

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
