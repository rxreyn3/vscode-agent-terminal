import * as vscode from 'vscode';
import { resolveCwd } from './cwd';
import { buildFinalCommand, precheckBinary } from './command';
import { resolveWindowsCommand } from './windows';

export function activate(context: vscode.ExtensionContext) {
  let statusItem: vscode.StatusBarItem | undefined;

  function refreshStatusBar() {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      const show = cfg.get<boolean>('showStatusBar', false);
      if (show && !statusItem) {
        statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        statusItem.text = '$(rocket) Codex';
        statusItem.tooltip = 'Run Codex CLI';
        statusItem.command = 'codexcli.run';
        statusItem.show();
        context.subscriptions.push(statusItem);
      } else if (!show && statusItem) {
        try { statusItem.dispose(); } catch { /* ignore */ }
        statusItem = undefined;
      } else if (show && statusItem) {
        statusItem.show();
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(`Codex CLI Button (status bar): ${e?.message || e}`);
    }
  }

  const run = vscode.commands.registerCommand('codexcli.run', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      let command = cfg.get<string>('command', 'codex');
      const args = cfg.get<string[]>('args', []);
      const precheck = cfg.get<boolean>('precheckBinary', true);
      const windowsMode = cfg.get<string>('windowsMode', 'block');
      const mode = cfg.get<string>('cwdMode', 'workspaceRoot');
      const rememberSelection = cfg.get<boolean>('rememberSelection', true);
      const cfgTerminalName = cfg.get<string>('terminalName', 'Codex CLI');
      const terminalName = String(cfgTerminalName || '').trim() || 'Codex CLI';
      const folders = vscode.workspace.workspaceFolders || [];
      const iconUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'command-icon.svg');

      // Tip: encourage structured args usage
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
          try { await vscode.commands.executeCommand('workbench.action.openSettings', 'codexcli'); } catch {}
        }
      }

      const editor = vscode.window.activeTextEditor;
      const editorUri = editor?.document?.uri;
      const lastPickedFsPath = context.workspaceState.get<string>('codexcli.lastPickedFsPath');
      let { cwd, needsPrompt } = resolveCwd({
        mode,
        folders,
        editorUri,
        rememberSelection,
        lastPickedFsPath
      } as any);

      if (mode === 'prompt' && needsPrompt) {
        const picks = folders.map(f => ({
          label: f.name || f.uri.fsPath.split(/[\\/]/).pop()!,
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

      let term = vscode.window.terminals.find(t => t.name === terminalName);
      let created = false;
      if (term && term.exitStatus !== undefined) {
        try { term.dispose(); } catch { /* ignore */ }
        term = undefined;
      }
      if (!term) {
        term = vscode.window.createTerminal({
          name: terminalName,
          cwd,
          location: { viewColumn: vscode.ViewColumn.Active },
          iconPath: iconUri
        });
        created = true;
      }

      const isWin = process.platform === 'win32';
      if (isWin) {
        const decision = resolveWindowsCommand({
          platform: process.platform,
          windowsMode,
          commandBase: command,
          args
        } as any);
        if ((decision as any).blocked) {
          vscode.window.showErrorMessage((decision as any).reason || 'Codex CLI is not officially supported on Windows. Please use WSL or switch windowsMode.');
          return;
        }
        command = (decision as any).commandBase;
        while (args.length) args.pop();
        for (const a of ((decision as any).args || [])) args.push(a);
      }

      if (precheck) {
        const res = precheckBinary({ commandBase: command, isWindows: isWin } as any);
        if (!res.ok) {
          vscode.window.showErrorMessage(`Command not found: ${res.base}. Add it to PATH or set an absolute path in codexcli.command.`);
          return;
        }
      }

      const final = buildFinalCommand({ commandBase: command, args, isWindows: isWin } as any);

      term.show(false);
      if (created) {
        term.sendText(final, true);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Codex CLI Button: ${err?.message || err}`);
    }
  });

  context.subscriptions.push(run);

  refreshStatusBar();
  const cfgListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e || e.affectsConfiguration('codexcli.showStatusBar') || e.affectsConfiguration('codexcli')) {
      refreshStatusBar();
    }
  });
  context.subscriptions.push(cfgListener);
}

export function deactivate() {}

