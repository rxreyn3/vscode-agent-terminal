'use strict';

const assert = require('assert');

// Start TDD: import a module that does not exist yet
let cmd;
try {
  cmd = require('../src/command.js');
} catch (e) {
  // Leave cmd undefined; tests that reference it will fail until implemented
}

function run(name, fn) {
  try {
    fn();
    console.log(`\u2713 ${name}`);
  } catch (err) {
    console.error(`\u2717 ${name}`);
    console.error(err && err.stack || err);
    process.exitCode = 1;
  }
}

run('buildFinalCommand quotes args (POSIX)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const final = cmd.buildFinalCommand({ commandBase: 'codex', args: ['-p', 'my profile'], isWindows: false });
  // Minimal quoting on POSIX: only quote when needed
  assert.strictEqual(final, "codex -p 'my profile'");
});

run('buildFinalCommand quotes args (Windows)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const final = cmd.buildFinalCommand({ commandBase: 'codex', args: ['-p', 'my "quoted" profile'], isWindows: true });
  assert.strictEqual(final, 'codex "-p" "my \\\"quoted\\\" profile"');
});

run('precheckBinary fails when which/where returns non-zero', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const fakeSpawn = () => ({ status: 1 });
  const res = cmd.precheckBinary({ commandBase: 'codex --flag', isWindows: false, spawnSync: fakeSpawn });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.base, 'codex');
});

run('precheckBinary passes when which/where returns zero', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const fakeSpawn = () => ({ status: 0 });
  const res = cmd.precheckBinary({ commandBase: 'codex', isWindows: false, spawnSync: fakeSpawn });
  assert.strictEqual(res.ok, true);
});

run('precheckBinary uses fs check for path-based command (exists)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const fakeFs = { existsSync: (p) => p.endsWith('codex') };
  const res = cmd.precheckBinary({ commandBase: '/usr/local/bin/codex', isWindows: false, fs: fakeFs });
  assert.strictEqual(res.ok, true);
});

run('precheckBinary uses fs check for path-based command (missing)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const fakeFs = { existsSync: () => false };
  const res = cmd.precheckBinary({ commandBase: '/opt/tools/codex', isWindows: false, fs: fakeFs });
  assert.strictEqual(res.ok, false);
});

run('buildFinalCommand tokenizes composite arg (POSIX)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const final = cmd.buildFinalCommand({ commandBase: 'codex', args: ['-p brain'], isWindows: false });
  assert.strictEqual(final, 'codex -p brain');
});

run('buildFinalCommand tokenizes composite arg (Windows)', () => {
  assert.ok(cmd, 'src/command.js should be implemented');
  const final = cmd.buildFinalCommand({ commandBase: 'codex', args: ['-p brain'], isWindows: true });
  assert.strictEqual(final, 'codex "-p" "brain"');
});
