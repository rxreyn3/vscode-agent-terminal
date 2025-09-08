import * as path from 'path';

function tryRequire(name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  try { return require(name); } catch { return null; }
}

// Prefer libraries when available, but keep robust fallbacks so tests and
// offline environments continue to work.
const shellQuote: any = tryRequire('shell-quote');

export function quoteArg(arg: unknown, isWindows: boolean): string {
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

function isPosixSafeChars(s: string): boolean {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(s);
}

export function quoteArgPosixMinimal(arg: unknown): string {
  const s = String(arg == null ? '' : arg);
  // Do not quote flags like -p or --profile
  if (/^-{1,2}[^\s]+$/.test(s)) return s;
  if (isPosixSafeChars(s)) return s;
  return "'" + s.replace(/'/g, `'\\''`) + "'";
}

export function tokenizeArgs(inputArgs: unknown[]): string[] {
  const args = Array.isArray(inputArgs) ? inputArgs : [];
  const out: string[] = [];
  for (const a of args) {
    if (a == null) continue;
    const s = String(a);

    if (shellQuote && typeof shellQuote.parse === 'function' && typeof a === 'string') {
      const tokens = shellQuote.parse(s).filter((t: unknown) => typeof t === 'string');
      if (tokens.length <= 1) {
        // Keep as a single argument (e.g., value with spaces but no leading flag)
        if (tokens.length === 1) out.push(tokens[0]); else out.push(s);
        continue;
      }
      if (/^-/.test(tokens[0])) {
        // Treat first token as the flag; join the remainder back into a single value
        out.push(tokens[0]);
        const rest = tokens.slice(1).join(' ').trim();
        if (rest) out.push(rest);
        continue;
      }
      // Not a leading flag: treat the whole item as a single argument
      out.push(s);
      continue;
    }

    // Fallback without shell-quote: split only once when starting with a flag
    if (/^-/.test(s) && /\s/.test(s)) {
      const m = s.match(/^(\S+)\s+([\s\S]+)$/);
      if (m) {
        out.push(m[1]);
        out.push(m[2]);
        continue;
      }
    }
    out.push(s);
  }
  return out;
}

export function buildFinalCommand(options?: { commandBase?: string; args?: unknown[]; isWindows?: boolean }): string {
  const commandBase = options && options.commandBase ? options.commandBase : '';
  const rawArgs = options && Array.isArray(options.args) ? options.args : [];
  const isWindows = !!(options && options.isWindows);

  // Normalize args: split composite items like "-p brain" into tokens
  const args = tokenizeArgs(rawArgs);

  if (!isWindows) {
    // POSIX: minimal quoting; avoid quoting flags
    const quoted = args.map(a => quoteArgPosixMinimal(a));
    return [commandBase, ...quoted].join(' ').trim();
  }

  // Windows: quote each arg with double quotes
  const quoted = args.map(a => quoteArg(a, true));
  return [commandBase, ...quoted].join(' ').trim();
}

function isPathLike(base: string): boolean {
  if (!base) return false;
  if (path.isAbsolute(base)) return true;
  if (base.includes('/') || base.includes('\\')) return true;
  if (base.startsWith('.' + path.sep)) return true;
  if (/^[A-Za-z]:[\\/]/.test(base)) return true;
  return false;
}

export default {
  quoteArg,
  buildFinalCommand,
  quoteArgPosixMinimal,
  tokenizeArgs
};
