'use strict';

export type WindowsMode = 'block' | 'wsl' | 'native';

export function resolveWindowsCommand(opts: {
  platform: string;
  windowsMode?: WindowsMode;
  commandBase?: string;
  args?: string[];
}): { blocked: boolean; reason?: string; commandBase: string; args: string[] } {
  const platform = opts && opts.platform;
  const mode: WindowsMode = (opts && opts.windowsMode) || 'block';
  const base = (opts && opts.commandBase) || '';
  const args = Array.isArray(opts && opts.args) ? (opts!.args as string[]).slice() : [];

  if (platform !== 'win32') {
    return { blocked: false, commandBase: base, args };
  }

  if (mode === 'block') {
    return {
      blocked: true,
      reason: 'Codex CLI on Windows is experimental. Please use WSL or switch windowsMode.',
      commandBase: base,
      args
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

export default { resolveWindowsCommand };

