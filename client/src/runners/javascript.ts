import type { FileNode } from '../types';

/**
 * Builds an HTML document that runs the project's JavaScript with ES-module
 * imports resolved via an import map. Relative imports like `./utils.js` are
 * rewritten to bare specifiers (`codebud:utils.js`).
 *
 * Crucially, the blob URLs and the import map are created INSIDE the iframe at
 * runtime — not in the parent — so they share the iframe's (sandboxed) origin
 * and can be imported. Building them in the parent fails with "Failed to fetch
 * dynamically imported module" because the sandboxed iframe can't read the
 * parent origin's blob URLs.
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

  // Map of bare specifier -> rewritten source code.
  const sources: Record<string, string> = {};
  for (const f of jsFiles) {
    sources[specifier(f.path)] = f.content.replace(
      /(\bfrom\s+|\bimport\s+)(["'])(\.[^"']+)\2/g,
      (_m, kw: string, q: string, rel: string) => `${kw}${q}${resolve(f.path, rel)}${q}`,
    );
  }

  const entry =
    specifier(entryPath) in sources
      ? specifier(entryPath)
      : specifier('index.js') in sources
        ? specifier('index.js')
        : Object.keys(sources)[0];

  // Embed as JSON, escaping any </script> so it can't break out of the tag.
  const payload = JSON.stringify({ sources, entry }).replace(/<\/script/gi, '<\\/script');

  return `<!doctype html><html><head><meta charset="utf-8" />
<script id="cb-data" type="application/json">${payload}</script>
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
<script>
  (function () {
    const { sources, entry } = JSON.parse(document.getElementById('cb-data').textContent);
    const imports = {};
    for (const spec in sources) {
      imports[spec] = URL.createObjectURL(new Blob([sources[spec]], { type: 'text/javascript' }));
    }
    // Inject the import map BEFORE the first module import.
    const im = document.createElement('script');
    im.type = 'importmap';
    im.textContent = JSON.stringify({ imports });
    document.head.appendChild(im);

    // Then run the entry module.
    const run = document.createElement('script');
    run.type = 'module';
    run.textContent =
      'import(' + JSON.stringify(entry) + ')' +
      '.catch(e => console.error(e && e.stack ? e.stack : String(e)))' +
      '.finally(() => parent.postMessage({ __codebud: true, level: "done" }, "*"));';
    document.body.appendChild(run);
  })();
</script>
</body></html>`;
}
