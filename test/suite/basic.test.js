'use strict';

const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

describe('Basic extension checks', function() {
  it('registers the replrunner.run command', async function() {
    const ext = vscode.extensions.getExtension('local.repl-runner');
    assert.ok(ext, 'Extension should be found');
    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('replrunner.run'), 'replrunner.run should be registered');
  });

  it('recreates terminal after exit and sends command once', async function() {
    const cfg = vscode.workspace.getConfiguration('replrunner');
    await cfg.update('cwdMode', 'workspaceRoot', vscode.ConfigurationTarget.Workspace);
    await cfg.update('profiles', [
      { id: 'test', label: 'Test REPL', command: 'codex', terminalName: 'Recreate REPL' }
    ], vscode.ConfigurationTarget.Workspace);

    // Existing terminal with matching name but exited
    const fakeDead = {
      name: 'Recreate REPL',
      exitStatus: { code: 0 },
      dispose: () => {}
    };

    const originalDescriptor = Object.getOwnPropertyDescriptor(vscode.window, 'terminals');
    Object.defineProperty(vscode.window, 'terminals', {
      configurable: true,
      get() { return [fakeDead]; }
    });

    // Capture creation and sendText
    let createdOptions = undefined;
    let sendCalls = 0;
    const originalCreateTerminal = vscode.window.createTerminal;
    vscode.window.createTerminal = (options) => {
      createdOptions = options;
      return {
        name: options && options.name || 'Codex CLI',
        exitStatus: undefined,
        show: () => {},
        sendText: () => { sendCalls++; },
        dispose: () => {}
      };
    };

    try {
      await vscode.commands.executeCommand('replrunner.run');
      assert.ok(createdOptions, 'Should create a new terminal after exit');
      assert.strictEqual(sendCalls, 1, 'Should send command once for new terminal');
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
      if (originalDescriptor) {
        Object.defineProperty(vscode.window, 'terminals', originalDescriptor);
      }
    }
  });

  it('workspaceRoot mode uses first folder as cwd', async function() {
    const cfg = vscode.workspace.getConfiguration('replrunner');
    await cfg.update('cwdMode', 'workspaceRoot', vscode.ConfigurationTarget.Workspace);
    await cfg.update('profiles', [
      { id: 'test', label: 'Test REPL', command: 'codex', terminalName: 'Root REPL' }
    ], vscode.ConfigurationTarget.Workspace);

    const workspaceFile = path.resolve(__dirname, '../../test-fixtures/multi-root.code-workspace');
    const fixturesRoot = path.dirname(workspaceFile);
    const folderA = path.resolve(fixturesRoot, 'A');

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
      await vscode.commands.executeCommand('replrunner.run');
      assert.strictEqual(path.resolve(capturedCwd), path.resolve(folderA));
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });

  it('activeWorkspace mode uses workspace containing active file', async function() {
    const cfg = vscode.workspace.getConfiguration('replrunner');
    await cfg.update('cwdMode', 'activeWorkspace', vscode.ConfigurationTarget.Workspace);
    await cfg.update('profiles', [
      { id: 'test', label: 'Test REPL', command: 'codex', terminalName: 'ActiveWS REPL' }
    ], vscode.ConfigurationTarget.Workspace);

    const workspaceFile = path.resolve(__dirname, '../../test-fixtures/multi-root.code-workspace');
    const fixturesRoot = path.dirname(workspaceFile);
    const folderB = path.resolve(fixturesRoot, 'B');
    const fileInB = path.resolve(folderB, 'README.txt');

    const doc = await vscode.workspace.openTextDocument(fileInB);
    await vscode.window.showTextDocument(doc);

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
      await vscode.commands.executeCommand('replrunner.run');
      assert.strictEqual(path.resolve(capturedCwd), path.resolve(folderB));
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });

  it('activeFileDir mode uses directory of active file', async function() {
    const cfg = vscode.workspace.getConfiguration('replrunner');
    await cfg.update('cwdMode', 'activeFileDir', vscode.ConfigurationTarget.Workspace);
    await cfg.update('profiles', [
      { id: 'test', label: 'Test REPL', command: 'codex', terminalName: 'ActiveFileDir REPL' }
    ], vscode.ConfigurationTarget.Workspace);

    const workspaceFile = path.resolve(__dirname, '../../test-fixtures/multi-root.code-workspace');
    const fixturesRoot = path.dirname(workspaceFile);
    const folderB = path.resolve(fixturesRoot, 'B');
    const nestedFile = path.resolve(folderB, 'src', 'index.txt');

    const doc = await vscode.workspace.openTextDocument(nestedFile);
    await vscode.window.showTextDocument(doc);

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
      await vscode.commands.executeCommand('replrunner.run');
      assert.strictEqual(path.resolve(capturedCwd), path.dirname(path.resolve(nestedFile)));
    } finally {
      vscode.window.createTerminal = originalCreateTerminal;
    }
  });
});
