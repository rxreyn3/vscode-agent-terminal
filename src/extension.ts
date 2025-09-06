import * as vscode from 'vscode';
import { resolveCwd } from './cwd';
import { buildFinalCommand } from './command';
import { resolveWindowsCommand } from './windows';

export function activate(context: vscode.ExtensionContext) {
  let statusItem: vscode.StatusBarItem | undefined;

  function refreshStatusBar() {
    try {
      const cfg = vscode.workspace.getConfiguration('replrunner');
      const show = cfg.get<boolean>('showStatusBar', false);
      if (show && !statusItem) {
        statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        statusItem.text = '$(terminal) REPL';
        statusItem.tooltip = 'Run REPL';
        statusItem.command = 'replrunner.run';
        statusItem.show();
        context.subscriptions.push(statusItem);
      } else if (!show && statusItem) {
        try { statusItem.dispose(); } catch { /* ignore */ }
        statusItem = undefined;
      } else if (show && statusItem) {
        statusItem.show();
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(`REPL Runner (status bar): ${e?.message || e}`);
    }
  }

  const run = vscode.commands.registerCommand('replrunner.run', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('replrunner');
      const windowsMode = cfg.get<string>('windowsMode', 'block');
      const mode = cfg.get<string>('cwdMode', 'workspaceRoot');
      const rememberSelection = cfg.get<boolean>('rememberSelection', true);
      const folders = vscode.workspace.workspaceFolders || [];

      type Profile = {
        id: string;
        label: string;
        command: string;
        args?: string[];
        terminalName?: string;
        icon?: string; // relative path or codicon id
      };
      const profiles = (cfg.get<any[]>('profiles', []) || []) as Profile[];

      // Choose profile: 0 -> show settings helper; 1 -> auto; >1 -> QuickPick
      let chosen: Profile | undefined;
      if (!profiles || profiles.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          'No REPL profiles configured. Open settings to add profiles?',
          'Open Settings',
          'Cancel'
        );
        if (choice === 'Open Settings') {
          try { await vscode.commands.executeCommand('workbench.action.openSettings', 'replrunner'); } catch {}
        }
        return;
      } else if (profiles.length === 1) {
        chosen = profiles[0];
      } else {
        const picks = profiles.map(p => ({
          label: p.label,
          description: `${p.command}${(p.args && p.args.length) ? ' ' + p.args.join(' ') : ''}`,
          profile: p
        }));
        const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Select a REPL profile to run' });
        if (!pick) return;
        chosen = pick.profile;
      }

      if (!chosen) return;
      let command = chosen.command;
      const args = Array.isArray(chosen.args) ? chosen.args.slice() : [];
      const terminalName = String(chosen.terminalName || `${chosen.label}`).trim();

      // Tip: encourage structured args usage
      const tipKey = 'replrunner.tip.commandHasFlagsShown';
      const hasFlagsInCommand = /\s+-{1,2}[^\s]/.test(String(command || ''));
      if (hasFlagsInCommand && !context.workspaceState.get(tipKey)) {
        const choice = await vscode.window.showInformationMessage(
          "Tip: Move flags from 'command' into profile 'args' for reliable quoting (e.g., command: 'codex', args: ['-p', 'brain']).",
          'Open Settings',
          'Dismiss'
        );
        await context.workspaceState.update(tipKey, true);
        if (choice === 'Open Settings') {
          try { await vscode.commands.executeCommand('workbench.action.openSettings', 'replrunner'); } catch {}
        }
      }

      const editor = vscode.window.activeTextEditor;
      const editorUri = editor?.document?.uri;
      const lastPickedFsPath = context.workspaceState.get<string>('replrunner.lastPickedFsPath');
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
          placeHolder: 'Select workspace folder for REPL Runner'
        });
        if (!pick) {
          return; // user canceled
        }
        cwd = pick.fsPath;
        if (rememberSelection) {
          await context.workspaceState.update('replrunner.lastPickedFsPath', cwd);
        }
      }

      let term = vscode.window.terminals.find(t => t.name === terminalName);
      let created = false;
      if (term && term.exitStatus !== undefined) {
        try { term.dispose(); } catch { /* ignore */ }
        term = undefined;
      }
      if (!term) {
        let iconPath: vscode.Uri | vscode.ThemeIcon | undefined = undefined;
        if (chosen.icon) {
          const icon = String(chosen.icon).trim();
          if (icon.startsWith('$((') || icon.startsWith('$(')) {
            iconPath = new (vscode as any).ThemeIcon(icon.replace(/^\$\(|\$\(\(/, '').replace(/\)$/, ''));
          } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(icon)) {
            // URI string like file:///... or vscode-resource
            iconPath = vscode.Uri.parse(icon);
          } else if (icon.startsWith('/') || /^[A-Za-z]:[\\/]/.test(icon)) {
            // Absolute filesystem path (POSIX or Windows)
            iconPath = vscode.Uri.file(icon);
          } else {
            // Relative to the extension
            iconPath = vscode.Uri.joinPath(context.extensionUri, icon);
          }
        }
        term = vscode.window.createTerminal({
          name: terminalName,
          cwd,
          location: { viewColumn: vscode.ViewColumn.Active },
          iconPath
        } as any);
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
          vscode.window.showErrorMessage((decision as any).reason || 'REPL on Windows may be limited. Please use WSL or switch windowsMode.');
          return;
        }
        command = (decision as any).commandBase;
        while (args.length) args.pop();
        for (const a of ((decision as any).args || [])) args.push(a);
      }

      // No precheck: rely on the user shell/terminal environment

      const final = buildFinalCommand({ commandBase: command, args, isWindows: isWin } as any);

      term.show(false);
      if (created) {
        term.sendText(final, true);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`REPL Runner: ${err?.message || err}`);
    }
  });

  context.subscriptions.push(run);

  refreshStatusBar();
  const cfgListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (!e || e.affectsConfiguration('replrunner.showStatusBar') || e.affectsConfiguration('replrunner')) {
      refreshStatusBar();
    }
  });
  context.subscriptions.push(cfgListener);
}

export function deactivate() {}
