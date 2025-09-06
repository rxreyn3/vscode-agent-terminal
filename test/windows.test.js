'use strict';

const assert = require('assert');

let win;
try {
  win = require('../out/windows.js');
} catch (e) {
  // leave undefined to make tests fail until implemented
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

run('block mode blocks on win32 with default command', () => {
  assert.ok(win, 'src/windows.js should be implemented');
  const res = win.resolveWindowsCommand({
    platform: 'win32',
    windowsMode: 'block',
    commandBase: 'codex',
    args: ['-p', 'profile']
  });
  assert.strictEqual(res.blocked, true);
  assert.ok(/experimental|windows/i.test(res.reason || ''), 'should mention experimental/windows');
});

run('native mode passes through unchanged', () => {
  assert.ok(win, 'src/windows.js should be implemented');
  const res = win.resolveWindowsCommand({
    platform: 'win32',
    windowsMode: 'native',
    commandBase: 'codex',
    args: ['-p', 'my prof']
  });
  assert.deepStrictEqual(res, { commandBase: 'codex', args: ['-p', 'my prof'], blocked: false });
});

run('wsl mode wraps base into wsl.exe and prepends original base to args', () => {
  assert.ok(win, 'src/windows.js should be implemented');
  const res = win.resolveWindowsCommand({
    platform: 'win32',
    windowsMode: 'wsl',
    commandBase: 'codex',
    args: ['-p', 'abc']
  });
  assert.strictEqual(res.blocked, false);
  assert.strictEqual(res.commandBase.toLowerCase(), 'wsl.exe');
  assert.deepStrictEqual(res.args, ['codex', '-p', 'abc']);
});
