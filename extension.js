// Minimal VS Code extension in plain JS
// Adds an editor title button that opens a terminal in the editor
// area and runs `codex`.

const vscode = require('vscode');
const { resolveCwd } = require('./src/cwd');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const run = vscode.commands.registerCommand('codexcli.run', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      const command = cfg.get('command', 'codex');
      const preserveFocus = cfg.get('preserveEditorFocus', true);
      const mode = cfg.get('cwdMode', 'workspaceRoot');
      const rememberSelection = cfg.get('rememberSelection', true);
      const folders = vscode.workspace.workspaceFolders || [];

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
      let term = vscode.window.terminals.find(t => t.name === 'Codex CLI');
      // If the terminal process has exited, dispose it so we can recreate fresh.
      if (term && term.exitStatus !== undefined) {
        try { term.dispose(); } catch (_) { /* ignore */ }
        term = undefined;
      }
      if (!term) {
        // Force terminal into the editor area by specifying a viewColumn.
        term = vscode.window.createTerminal({
          name: 'Codex CLI',
          cwd,
          location: { viewColumn: vscode.ViewColumn.Active }
        });
      }

      // Show but keep editor focus (true preserves focus on the editor)
      term.show(preserveFocus);
      term.sendText(command, true);
    } catch (err) {
      vscode.window.showErrorMessage(`Codex CLI Button: ${err?.message || err}`);
    }
  });

  context.subscriptions.push(run);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
