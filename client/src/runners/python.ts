import type { FileNode } from '../types';

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodidePromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<any>;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Pyodide'));
    document.head.appendChild(s);
  });
}

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const py = await window.loadPyodide!({ indexURL: PYODIDE_URL });
      return py;
    })();
  }
  return pyodidePromise;
}

export interface PyResult {
  output: string;
  error?: string;
}

/** Runs the project's Python (entry = main.py) with all .py files on the path. */
export async function runPython(
  files: FileNode[],
  entryPath = 'main.py',
  onProgress?: (msg: string) => void,
): Promise<PyResult> {
  onProgress?.('Loading Python runtime (Pyodide)…');
  const py = await getPyodide();

  const pyFiles = files.filter((f) => f.path.endsWith('.py') && !f.isFolder);
  // Write every .py file into the virtual filesystem so imports resolve.
  for (const f of pyFiles) {
    const dir = f.path.includes('/') ? f.path.replace(/\/[^/]*$/, '') : '';
    if (dir) py.FS.mkdirTree(dir);
    py.FS.writeFile(f.path, f.content);
  }

  const entry = pyFiles.find((f) => f.path === entryPath) ?? pyFiles[0];
  if (!entry) return { output: '', error: 'No Python file to run.' };

  onProgress?.('Running…');
  let output = '';
  py.setStdout({ batched: (s: string) => (output += s + '\n') });
  py.setStderr({ batched: (s: string) => (output += s + '\n') });

  try {
    await py.runPythonAsync(`
import sys, runpy
sys.path.insert(0, '')
runpy.run_path(${JSON.stringify(entry.path)}, run_name="__main__")
`);
    return { output };
  } catch (err) {
    return { output, error: (err as Error).message };
  }
}
