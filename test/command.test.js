'use strict';

const assert = require('assert');

// Start TDD: import a module that does not exist yet
let cmd;
try {
  cmd = require('../out/command.js');
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

// precheckBinary removed: extension relies on terminal environment

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
