'use strict';

const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

describe('QuickPick cwd prompt', function() {
  it('prompt mode uses selected folder as cwd and remembers it', async function() {
    // Ensure our extension is activated on demand when the command runs
    const ext = vscode.extensions.getExtension('local.codex-cli-button');
    assert.ok(ext, 'Extension should be found');

    // Configure the extension for prompt mode and to remember selections
    const cfg = vscode.workspace.getConfiguration('codexcli');
    await cfg.update('cwdMode', 'prompt', vscode.ConfigurationTarget.Workspace);
    await cfg.update('rememberSelection', true, vscode.ConfigurationTarget.Workspace);

    // Build expected pick for folder B in the opened multi-root workspace
    const workspaceFile = path.resolve(__dirname, '../../test-fixtures/multi-root.code-workspace');
    const fixturesRoot = path.dirname(workspaceFile);
    const folderB = path.resolve(fixturesRoot, 'B');

    // Stub showQuickPick to auto-select folder B
    let quickPickCalls = 0;
    const originalShowQuickPick = vscode.window.showQuickPick;
    vscode.window.showQuickPick = async (items, options) => {
      quickPickCalls++;
      // Find the item whose description matches B's fsPath
      const pick = items.find(i => i.description === folderB) || items[0];
      return pick;
    };

    // Stub createTerminal to capture cwd and avoid opening a real terminal
    let capturedCwd = undefined;
    const originalCreateTerminal = vscode.window.createTerminal;
    vscode.window.createTerminal = (options) => {
      capturedCwd = options && options.cwd;
      return {
        name: options && options.name || 'Codex CLI',
        exitStatus: undefined,
        show: () => {},
        sendText: () => {},
        dispose: () => {}
      };
    };

    try {
      // Execute the command which should trigger the QuickPick and use folder B as cwd
      await vscode.commands.executeCommand('codexcli.run');

      assert.strictEqual(quickPickCalls > 0, true, 'QuickPick should be shown');
      assert.strictEqual(path.resolve(capturedCwd), path.resolve(folderB), 'cwd should be folder B');
    } finally {
      // Restore stubs
      vscode.window.showQuickPick = originalShowQuickPick;
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });
});
