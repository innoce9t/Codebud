import type { FileNode } from '../types';

/**
 * Builds an HTML document that runs the project's JavaScript with ES-module
 * imports resolved via an import map. Relative imports like `./utils.js` are
 * rewritten to bare specifiers (`codebud:utils.js`) that the import map maps
 * to blob URLs — so multi-file projects with imports execute correctly.
 *
 * console.* and uncaught errors are forwarded to the parent via postMessage.
 */
export function buildJsRunnerDoc(files: FileNode[], entryPath = 'index.js'): string {
  const jsFiles = files.filter((f) => /\.(m?js)$/.test(f.path) && !f.isFolder);

  const specifier = (p: string) => `codebud:${p.replace(/^\.?\//, '')}`;

  function resolve(fromPath: string, rel: string): string {
    if (!rel.startsWith('.')) return rel; // bare / external — leave as-is
    const baseDir = fromPath.includes('/') ? fromPath.replace(/\/[^/]*$/, '') : '';
    const parts = (baseDir ? baseDir.split('/') : []).concat(rel.split('/'));
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    return specifier(stack.join('/'));
  }

  const importMap: Record<string, string> = {};
  for (const f of jsFiles) {
    // Rewrite this file's relative imports to bare specifiers.
    const rewritten = f.content.replace(
      /(\bfrom\s+|\bimport\s+)(["'])(\.[^"']+)\2/g,
      (_m, kw: string, q: string, rel: string) => `${kw}${q}${resolve(f.path, rel)}${q}`,
    );
    const blob = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
    importMap[specifier(f.path)] = blob;
  }

  const entry =
    importMap[specifier(entryPath)] ??
    importMap[specifier('index.js')] ??
    Object.values(importMap)[0];

  return `<!doctype html><html><head><meta charset="utf-8" />
<script type="importmap">${JSON.stringify({ imports: importMap })}</script>
<script>
  const send = (level, args) => parent.postMessage({ __codebud: true, level,
    text: args.map(a => { try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); } catch { return String(a); } }).join(' ')
  }, '*');
  ['log','info','warn','error','debug'].forEach(l => {
    const orig = console[l].bind(console);
    console[l] = (...a) => { send(l, a); orig(...a); };
  });
  window.addEventListener('error', e => send('error', [e.message + (e.filename ? ' @ ' + e.filename : '')]));
  window.addEventListener('unhandledrejection', e => send('error', ['Unhandled promise rejection: ' + (e.reason?.message ?? e.reason)]));
</script>
</head><body>
<script type="module">
  try { await import(${JSON.stringify(entry)}); }
  catch (err) { console.error(err?.stack || String(err)); }
  parent.postMessage({ __codebud: true, level: 'done' }, '*');
</script>
</body></html>`;
}
