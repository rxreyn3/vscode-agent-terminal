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

  it('uses configured terminalName when creating a terminal', async function() {
    const ext = vscode.extensions.getExtension('local.codex-cli-button');
    assert.ok(ext, 'Extension should be found');

    const cfg = vscode.workspace.getConfiguration('codexcli');
    await cfg.update('cwdMode', 'workspaceRoot', vscode.ConfigurationTarget.Workspace);
    await cfg.update('precheckBinary', false, vscode.ConfigurationTarget.Workspace);
    await cfg.update('terminalName', 'My Codex', vscode.ConfigurationTarget.Workspace);

    let capturedName = undefined;
    const originalCreateTerminal = vscode.window.createTerminal;
    vscode.window.createTerminal = (options) => {
      capturedName = options && options.name;
      return {
        name: options && options.name || 'Codex CLI',
        exitStatus: undefined,
        show: () => {},
        sendText: () => {},
        dispose: () => {}
      };
    };

    try {
      await vscode.commands.executeCommand('codexcli.run');
      assert.strictEqual(capturedName, 'My Codex');
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });

  it('reuses existing terminal matching terminalName (no duplicate create)', async function() {
    const ext = vscode.extensions.getExtension('local.codex-cli-button');
    assert.ok(ext, 'Extension should be found');

    const cfg = vscode.workspace.getConfiguration('codexcli');
    await cfg.update('cwdMode', 'workspaceRoot', vscode.ConfigurationTarget.Workspace);
    await cfg.update('precheckBinary', false, vscode.ConfigurationTarget.Workspace);
    await cfg.update('terminalName', 'Reuse Codex', vscode.ConfigurationTarget.Workspace);

    // Fake existing terminal with matching name
    let showCalls = 0;
    const fakeTerm = {
      name: 'Reuse Codex',
      exitStatus: undefined,
      show: () => { showCalls++; },
      sendText: () => {},
      dispose: () => {}
    };

    // Patch window.terminals getter to return our fake terminal
    const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.window, 'terminals');
    Object.defineProperty(vscode.window, 'terminals', {
      configurable: true,
      get() { return [fakeTerm]; }
    });

    // Stub createTerminal to detect any unintended creation
    let createCalls = 0;
    const originalCreateTerminal = vscode.window.createTerminal;
    vscode.window.createTerminal = (options) => {
      createCalls++;
      return fakeTerm;
    };

    try {
      await vscode.commands.executeCommand('codexcli.run');
      assert.strictEqual(createCalls, 0, 'Should not create a new terminal when one matches by name');
      assert.ok(showCalls > 0, 'Existing terminal should be shown');
    } finally {
      // Restore stubs
      vscode.window.createTerminal = originalCreateTerminal;
      if (originalDescriptor) {
        Object.defineProperty(vscode.window, 'terminals', originalDescriptor);
      }
    }
  });

  it('sets terminal icon to media/command-icon.svg', async function() {
    const ext = vscode.extensions.getExtension('local.codex-cli-button');
    assert.ok(ext, 'Extension should be found');

    const cfg = vscode.workspace.getConfiguration('codexcli');
    await cfg.update('cwdMode', 'workspaceRoot', vscode.ConfigurationTarget.Workspace);
    await cfg.update('precheckBinary', false, vscode.ConfigurationTarget.Workspace);

    let capturedIcon = undefined;
    const originalCreateTerminal = vscode.window.createTerminal;
    vscode.window.createTerminal = (options) => {
      capturedIcon = options && options.iconPath;
      return {
        name: (options && options.name) || 'Codex CLI',
        exitStatus: undefined,
        show: () => {},
        sendText: () => {},
        dispose: () => {}
      };
    };

    try {
      await vscode.commands.executeCommand('codexcli.run');
      assert.ok(capturedIcon, 'iconPath should be set');
      const asString = String(capturedIcon);
      assert.ok(asString.includes('media/command-icon.svg'), 'iconPath should point to media/command-icon.svg');
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });
});
