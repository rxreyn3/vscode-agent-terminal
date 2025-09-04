'use strict';

const assert = require('assert');
const path = require('path');

// Intentionally import a module that does not exist yet to start with failing tests (TDD).
// The implementation will be added in src/cwd.js.
const { resolveCwd } = require('../src/cwd.js');

function makeFolder(p, name) {
  return { name, uri: { scheme: 'file', fsPath: path.resolve(p) } };
}

function fileUri(p) {
  return { scheme: 'file', fsPath: path.resolve(p) };
}

function untitledUri() {
  return { scheme: 'untitled' };
}

function run(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err && err.stack || err);
    process.exitCode = 1;
  }
}

// Test fixtures (paths need not exist; we only test string resolution)
const rootA = path.join(__dirname, 'fixtures', 'A');
const rootB = path.join(__dirname, 'fixtures', 'B');
const folders = [makeFolder(rootA, 'A'), makeFolder(rootB, 'B')];

run('workspaceRoot uses first workspace folder', () => {
  const { cwd } = resolveCwd({ mode: 'workspaceRoot', folders });
  assert.strictEqual(cwd, path.resolve(rootA));
});

run('activeWorkspace uses folder containing active file', () => {
  const editorUri = fileUri(path.join(rootB, 'src', 'index.js'));
  const { cwd } = resolveCwd({ mode: 'activeWorkspace', folders, editorUri });
  assert.strictEqual(cwd, path.resolve(rootB));
});

run('activeFileDir uses directory of active file', () => {
  const fp = path.join(rootB, 'src', 'index.js');
  const editorUri = fileUri(fp);
  const { cwd } = resolveCwd({ mode: 'activeFileDir', folders, editorUri });
  assert.strictEqual(cwd, path.dirname(path.resolve(fp)));
});

run('prompt reuses last selection when rememberSelection', () => {
  const lastPickedFsPath = path.resolve(rootB);
  const { cwd, needsPrompt } = resolveCwd({ mode: 'prompt', folders, rememberSelection: true, lastPickedFsPath });
  assert.strictEqual(needsPrompt, false);
  assert.strictEqual(cwd, path.resolve(rootB));
});

run('activeFileDir falls back to first folder for untitled', () => {
  const editorUri = untitledUri();
  const { cwd } = resolveCwd({ mode: 'activeFileDir', folders, editorUri });
  assert.strictEqual(cwd, path.resolve(rootA));
});

