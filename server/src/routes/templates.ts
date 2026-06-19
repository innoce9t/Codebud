import type { ProjectType } from '../models/Project.js';

export interface StarterFile {
  path: string;
  content: string;
}

/** Files seeded into a new project so it is immediately runnable. */
export function starterFiles(type: ProjectType): StarterFile[] {
  switch (type) {
    case 'javascript':
      return [
        {
          path: 'index.js',
          content: `import { greet } from './utils.js';\n\nconsole.log(greet('CodeBud'));\nconsole.log('2 + 3 =', 2 + 3);\n`,
        },
        {
          path: 'utils.js',
          content: `export function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n`,
        },
      ];
    case 'python':
      return [
        {
          path: 'main.py',
          content: `from utils import greet\n\nprint(greet("CodeBud"))\nprint("2 + 3 =", 2 + 3)\n`,
        },
        {
          path: 'utils.py',
          content: `def greet(name):\n    return f"Hello, {name}!"\n`,
        },
      ];
    case 'website':
      return [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Site</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="min-h-screen bg-slate-50 text-slate-800">
  <main class="max-w-2xl mx-auto p-10">
    <h1 class="text-4xl font-bold text-indigo-600">Hello, world</h1>
    <p class="mt-3 text-lg">Edit <code class="bg-slate-200 px-1 rounded">index.html</code> and watch the live preview update.</p>
    <button id="btn" class="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
      Click me
    </button>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
        },
        {
          path: 'styles.css',
          content: `/* Custom styles layered on top of Tailwind */\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n}\n`,
        },
        {
          path: 'script.js',
          content: `document.getElementById('btn').addEventListener('click', () => {\n  alert('It works!');\n});\n`,
        },
      ];
  }
}
