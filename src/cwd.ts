'use strict';

import * as path from 'path';

function normalize(p?: string): string | undefined {
  if (!p) return undefined;
  const r = path.resolve(p);
  return process.platform === 'win32' ? r.toLowerCase() : r;
}

function isWithin(filePath?: string, folderPath?: string): boolean {
  if (!filePath || !folderPath) return false;
  const f = normalize(filePath);
  const d = normalize(folderPath);
  if (!f || !d) return false;
  if (f === d) return true;
  const withSep = d.endsWith(path.sep) ? d : d + path.sep;
  return f.startsWith(withSep);
}

function firstFolderFsPath(folders?: Array<{ uri: { fsPath: string } }>): string | undefined {
  return folders && folders[0] && folders[0].uri && folders[0].uri.fsPath;
}

function findFolderForFile(
  folders: Array<{ uri: { fsPath: string } }> | undefined,
  fileFsPath?: string
): string | undefined {
  if (!folders || !fileFsPath) return undefined;
  let match: string | undefined = undefined;
  for (const f of folders) {
    const dir = f && f.uri && f.uri.fsPath;
    if (dir && isWithin(fileFsPath, dir)) {
      if (!match || (dir.length > match.length)) {
        match = dir;
      }
    }
  }
  return match;
}

export function resolveCwd(options?: {
  mode?: 'workspaceRoot' | 'activeWorkspace' | 'activeFileDir' | 'prompt';
  folders?: Array<{ name?: string; uri: { scheme: string; fsPath: string } }>;
  editorUri?: { scheme: string; fsPath?: string } | undefined;
  rememberSelection?: boolean;
  lastPickedFsPath?: string;
}): { cwd: string | undefined; needsPrompt: boolean } {
  const mode = options && options.mode ? options.mode : 'workspaceRoot';
  const folders = options && options.folders ? options.folders : [];
  const editorUri = options && options.editorUri ? options.editorUri : undefined;
  const rememberSelection = options && typeof options.rememberSelection === 'boolean' ? options.rememberSelection : true;
  const lastPickedFsPath = options && options.lastPickedFsPath ? options.lastPickedFsPath : undefined;

  const first = firstFolderFsPath(folders as any);

  switch (mode) {
    case 'activeWorkspace': {
      const fileFsPath = editorUri && editorUri.scheme === 'file' ? editorUri.fsPath : undefined;
      const match = fileFsPath ? findFolderForFile(folders as any, fileFsPath) : undefined;
      return { cwd: match || (first as any), needsPrompt: false };
    }
    case 'activeFileDir': {
      const fileFsPath = editorUri && editorUri.scheme === 'file' ? editorUri.fsPath : undefined;
      const dir = fileFsPath ? path.dirname(fileFsPath) : undefined;
      return { cwd: dir || (first as any), needsPrompt: false };
    }
    case 'prompt': {
      if ((folders && folders.length) <= 1) {
        return { cwd: (first as any), needsPrompt: false };
      }
      if (rememberSelection && lastPickedFsPath) {
        // Only reuse last selection if it still matches one of the open folders
        const valid = folders.some(f => f && f.uri && f.uri.fsPath && normalize(f.uri.fsPath) === normalize(lastPickedFsPath));
        if (valid) {
          return { cwd: lastPickedFsPath, needsPrompt: false };
        }
      }
      return { cwd: undefined, needsPrompt: true };
    }
    case 'workspaceRoot':
    default: {
      return { cwd: (first as any), needsPrompt: false };
    }
  }
}

export default { resolveCwd };

