'use strict';

const path = require('path');

function tryRequire(name) {
  try { return require(name); } catch (_) { return null; }
}

// Prefer libraries when available, but keep robust fallbacks so tests and
// offline environments continue to work.
const whichLib = tryRequire('which');
const shellQuote = tryRequire('shell-quote');

function quoteArg(arg, isWindows) {
  const s = String(arg == null ? '' : arg);
  if (isWindows) {
    // Windows: wrap in double quotes and escape embedded quotes
    return '"' + s.replace(/"/g, '\\"') + '"';
  }
  // POSIX: if shell-quote is available, let it decide quoting for a single arg
  if (shellQuote && typeof shellQuote.quote === 'function') {
    return shellQuote.quote([s]);
  }
  // Fallback POSIX quoting: close/open around single quotes
  return "'" + s.replace(/'/g, `'\\''`) + "'";
}

function buildFinalCommand(options) {
  const commandBase = options && options.commandBase ? options.commandBase : '';
  const args = options && Array.isArray(options.args) ? options.args : [];
  const isWindows = !!(options && options.isWindows);

  if (!isWindows && shellQuote && typeof shellQuote.quote === 'function') {
    // Let shell-quote compose the whole argv for POSIX
    const argStr = args.length ? shellQuote.quote(args.map(a => String(a))) : '';
    return [commandBase, argStr].filter(Boolean).join(' ').trim();
  }

  // Windows or no library: quote per-arg using our helper
  const quoted = args.map(a => quoteArg(a, isWindows));
  return [commandBase, ...quoted].join(' ').trim();
}

function isPathLike(base) {
  if (!base) return false;
  if (path.isAbsolute(base)) return true;
  if (base.includes('/') || base.includes('\\')) return true;
  if (base.startsWith('.' + path.sep)) return true;
  if (/^[A-Za-z]:[\\/]/.test(base)) return true;
  return false;
}

function precheckBinary(options) {
  const commandBase = options && options.commandBase ? options.commandBase : '';
  const isWindows = !!(options && options.isWindows);
  const spawnSync = (options && options.spawnSync) || require('child_process').spawnSync;
  const fs = (options && options.fs) || require('fs');
  const which = (options && options.which) || whichLib;

  const base = String(commandBase).trim().split(/\s+/)[0] || '';
  if (!base) {
    return { ok: false, base };
  }

  if (isPathLike(base)) {
    const exists = !!(fs && typeof fs.existsSync === 'function' && fs.existsSync(base));
    return { ok: exists, base };
  }

  // Prefer which library when available, otherwise fallback to shelling out
  if (which && typeof which.sync === 'function') {
    try {
      const resolved = which.sync(base, { nothrow: true });
      return { ok: !!resolved, base };
    } catch (_) {
      return { ok: false, base };
    }
  }

  const check = isWindows ? `where ${base}` : `which ${base}`;
  const res = spawnSync(check, { shell: true });
  return { ok: res && res.status === 0, base };
}

module.exports = {
  quoteArg,
  buildFinalCommand,
  precheckBinary
};
