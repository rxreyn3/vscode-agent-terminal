'use strict';

const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.js');
    const workspacePath = path.resolve(__dirname, '..', 'test-fixtures', 'multi-root.code-workspace');
    // Pin VS Code version to match engines.vscode to reduce flakiness across API changes.
    let version = undefined;
    try {
      const pkg = require(path.resolve(__dirname, '..', 'package.json'));
      const engine = (pkg && pkg.engines && pkg.engines.vscode) || '';
      const m = String(engine).match(/(\d+)\.(\d+)\.(\d+)/);
      if (m) version = m[0];
    } catch (_) {}

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath, '--disable-extensions'],
      version
    });
  } catch (err) {
    console.error('Failed to run tests');
    console.error(err);
    process.exit(1);
  }
}

main();
