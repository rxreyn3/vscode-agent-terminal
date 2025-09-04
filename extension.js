// Minimal VS Code/Windsurf extension in plain JS
// Adds an editor title button that opens a terminal in the editor
// area and runs `codex`.

const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const run = vscode.commands.registerCommand('codexcli.run', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('codexcli');
      const command = cfg.get('command', 'codex');
      const preserveFocus = cfg.get('preserveEditorFocus', true);
      const folders = vscode.workspace.workspaceFolders || [];
      const cwd = folders.length ? folders[0].uri.fsPath : undefined;

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
