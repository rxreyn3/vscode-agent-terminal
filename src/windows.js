'use strict';

// Decide how to handle Windows platform for Codex CLI.
// Returns one of:
// - { blocked: true, reason }
// - { blocked: false, commandBase, args }
// Inputs: { platform, windowsMode, commandBase, args }

function resolveWindowsCommand(opts) {
  const platform = opts && opts.platform;
  const mode = opts && opts.windowsMode || 'block';
  const base = opts && opts.commandBase || '';
  const args = Array.isArray(opts && opts.args) ? opts.args.slice() : [];

  if (platform !== 'win32') {
    return { blocked: false, commandBase: base, args };
  }

  if (mode === 'block') {
    return {
      blocked: true,
      reason: 'Codex CLI on Windows is experimental. Please use WSL or switch windowsMode.'
    };
  }

  if (mode === 'wsl') {
    // Run through WSL by invoking: wsl.exe <original base> <args...>
    return {
      blocked: false,
      commandBase: 'wsl.exe',
      args: [base, ...args]
    };
  }

  // native: pass-through
  return { blocked: false, commandBase: base, args };
}

module.exports = {
  resolveWindowsCommand
};

