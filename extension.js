// Minimal VS Code extension in plain JS
// Adds an editor title button that opens a terminal in the editor
// area and runs `codex`.

const vscode = require('vscode');
const { resolveCwd } = require('./src/cwd');
const { buildFinalCommand, precheckBinary } = require('./src/command');
const { resolveWindowsCommand } = require('./src/windows');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Status bar item lifecycle
  let statusItem;
  function refreshStatusBar() {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      const show = cfg.get('showStatusBar', false);
      if (show && !statusItem) {
        statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        statusItem.text = '$(rocket) Codex';
        statusItem.tooltip = 'Run Codex CLI';
        statusItem.command = 'codexcli.run';
        statusItem.show();
        context.subscriptions.push(statusItem);
      } else if (!show && statusItem) {
        try { statusItem.dispose(); } catch (_) { /* ignore */ }
        statusItem = undefined;
      } else if (show && statusItem) {
        statusItem.show();
      }
    } catch (e) {
      // Surface errors but don't crash activation
      vscode.window.showErrorMessage(`Codex CLI Button (status bar): ${e?.message || e}`);
    }
  }

  const run = vscode.commands.registerCommand('codexcli.run', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      let command = cfg.get('command', 'codex');
      const args = cfg.get('args', []);
      const precheck = cfg.get('precheckBinary', true);
      const windowsMode = cfg.get('windowsMode', 'block');
      const mode = cfg.get('cwdMode', 'workspaceRoot');
      const rememberSelection = cfg.get('rememberSelection', true);
      const cfgTerminalName = cfg.get('terminalName', 'Codex CLI');
      const terminalName = String(cfgTerminalName || '').trim() || 'Codex CLI';
      const folders = vscode.workspace.workspaceFolders || [];
      const iconUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'command-icon.svg');

      // Soft guardrail: if users include flags in codexcli.command, suggest using args
      const tipKey = 'codexcli.tip.commandHasFlagsShown';
      const hasFlagsInCommand = /\s+-{1,2}[^\s]/.test(String(command || ''));
      if (hasFlagsInCommand && !context.workspaceState.get(tipKey)) {
        const choice = await vscode.window.showInformationMessage(
          "Tip: Move flags from 'codexcli.command' into 'codexcli.args' for reliable quoting (e.g., command: 'codex', args: ['-p', 'brain']).",
          'Open Settings',
          'Dismiss'
        );
        await context.workspaceState.update(tipKey, true);
        if (choice === 'Open Settings') {
          try { await vscode.commands.executeCommand('workbench.action.openSettings', 'codexcli'); } catch (_) {}
        }
      }

      const editor = vscode.window.activeTextEditor;
      const editorUri = editor?.document?.uri;
      const lastPickedFsPath = context.workspaceState.get('codexcli.lastPickedFsPath');
      let { cwd, needsPrompt } = resolveCwd({
        mode,
        folders,
        editorUri,
        rememberSelection,
        lastPickedFsPath
      });

      if (mode === 'prompt' && needsPrompt) {
        const picks = folders.map(f => ({
          label: f.name || f.uri.fsPath.split(/[\\/]/).pop(),
          description: f.uri.fsPath,
          fsPath: f.uri.fsPath
        }));
        const pick = await vscode.window.showQuickPick(picks, {
          placeHolder: 'Select workspace folder for Codex CLI'
        });
        if (!pick) {
          return; // user canceled
        }
        cwd = pick.fsPath;
        if (rememberSelection) {
          await context.workspaceState.update('codexcli.lastPickedFsPath', cwd);
        }
      }

      // Reuse an existing terminal if we already created one.
      let term = vscode.window.terminals.find(t => t.name === terminalName);
      let created = false;
      // If the terminal process has exited, dispose it so we can recreate fresh.
      if (term && term.exitStatus !== undefined) {
        try { term.dispose(); } catch (_) { /* ignore */ }
        term = undefined;
      }
      if (!term) {
        // Force terminal into the editor area by specifying a viewColumn.
        term = vscode.window.createTerminal({
          name: terminalName,
          cwd,
          location: { viewColumn: vscode.ViewColumn.Active },
          iconPath: iconUri
        });
        created = true;
      }

      // Windows gating & command adaptation
      const isWin = process.platform === 'win32';
      if (isWin) {
        const decision = resolveWindowsCommand({
          platform: process.platform,
          windowsMode,
          commandBase: command,
          args
        });
        if (decision.blocked) {
          vscode.window.showErrorMessage(decision.reason || 'Codex CLI is not officially supported on Windows. Please use WSL or switch windowsMode.');
          return;
        }
        // Apply possible transformation (e.g., wsl.exe codex ...)
        command = decision.commandBase;
        // Replace args in place for downstream quoting
        while (args.length) args.pop();
        for (const a of decision.args || []) args.push(a);
      }

      // Build final command with quoted args and optionally precheck the base binary.
      if (precheck) {
        const res = precheckBinary({ commandBase: command, isWindows: isWin });
        if (!res.ok) {
          vscode.window.showErrorMessage(
            `Command not found: ${res.base}. Add it to PATH or set an absolute path in codexcli.command.`
          );
          return;
        }
      }

      const final = buildFinalCommand({ commandBase: command, args, isWindows: isWin });

      // Always move focus to the Codex terminal when shown
      term.show(false);
      // Only send the command when creating a fresh terminal to avoid echoing
      if (created) {
        term.sendText(final, true);
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Codex CLI Button: ${err?.message || err}`);
    }
  });

  context.subscriptions.push(run);

  // Initialize and react to setting changes for the optional status bar item
  refreshStatusBar();
  const cfgListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e || e.affectsConfiguration('codexcli.showStatusBar') || e.affectsConfiguration('codexcli')) {
      refreshStatusBar();
    }
  });
  context.subscriptions.push(cfgListener);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
