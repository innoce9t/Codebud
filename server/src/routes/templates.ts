import type { ProjectType } from '../models/Project.js';

export interface StarterFile {
  path: string;
  content: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
}

export interface Template extends TemplateMeta {
  files: StarterFile[];
}

/** Catalog of selectable starter templates, grouped by workspace type. */
export const TEMPLATES: Record<ProjectType, Template[]> = {
  javascript: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'A minimal two-file project with a module import.',
      files: [
        {
          path: 'index.js',
          content: `import { greet } from './utils.js';\n\nconsole.log(greet('CodeBud'));\nconsole.log('2 + 3 =', 2 + 3);\n`,
        },
        { path: 'utils.js', content: `export function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n` },
      ],
    },
    {
      id: 'algorithms',
      name: 'Algorithms',
      description: 'Quicksort and binary search split across modules.',
      files: [
        {
          path: 'index.js',
          content: `import { quickSort } from './sorting.js';\nimport { binarySearch } from './search.js';\n\nconst data = [9, 3, 7, 1, 8, 2, 5];\nconst sorted = quickSort(data);\nconsole.log('sorted:', sorted);\n\nconst target = 7;\nconsole.log(\`index of \${target}:\`, binarySearch(sorted, target));\n`,
        },
        {
          path: 'sorting.js',
          content: `export function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const [pivot, ...rest] = arr;\n  const left = rest.filter((n) => n < pivot);\n  const right = rest.filter((n) => n >= pivot);\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}\n`,
        },
        {
          path: 'search.js',
          content: `export function binarySearch(sorted, target) {\n  let lo = 0;\n  let hi = sorted.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (sorted[mid] === target) return mid;\n    if (sorted[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\n`,
        },
      ],
    },
    {
      id: 'todo',
      name: 'Todo List',
      description: 'A small OOP-style todo app across three files.',
      files: [
        {
          path: 'index.js',
          content: `import { TodoStore } from './store.js';\nimport { formatTodo } from './todo.js';\n\nconst store = new TodoStore();\nstore.add('Learn CodeBud');\nstore.add('Build something cool');\nstore.complete(0);\n\nconsole.log('My Todos:');\nfor (const todo of store.all()) console.log(formatTodo(todo));\nconsole.log(\`\\n\${store.remaining()} remaining\`);\n`,
        },
        {
          path: 'todo.js',
          content: `let nextId = 1;\n\nexport function createTodo(text) {\n  return { id: nextId++, text, done: false };\n}\n\nexport function formatTodo(todo) {\n  return \`[\${todo.done ? 'x' : ' '}] #\${todo.id} \${todo.text}\`;\n}\n`,
        },
        {
          path: 'store.js',
          content: `import { createTodo } from './todo.js';\n\nexport class TodoStore {\n  constructor() {\n    this.todos = [];\n  }\n  add(text) {\n    this.todos.push(createTodo(text));\n  }\n  complete(index) {\n    if (this.todos[index]) this.todos[index].done = true;\n  }\n  all() {\n    return this.todos;\n  }\n  remaining() {\n    return this.todos.filter((t) => !t.done).length;\n  }\n}\n`,
        },
      ],
    },
  ],

  python: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'A minimal two-file project with an import.',
      files: [
        {
          path: 'main.py',
          content: `from utils import greet\n\nprint(greet("CodeBud"))\nprint("2 + 3 =", 2 + 3)\n`,
        },
        { path: 'utils.py', content: `def greet(name):\n    return f"Hello, {name}!"\n` },
      ],
    },
    {
      id: 'algorithms',
      name: 'Algorithms',
      description: 'Fibonacci, factorial and prime checks in a module.',
      files: [
        {
          path: 'main.py',
          content: `from algorithms import fib, is_prime, factorial\n\nprint("fib(10) =", fib(10))\nprint("factorial(5) =", factorial(5))\nprint("primes under 20:", [n for n in range(2, 20) if is_prime(n)])\n`,
        },
        {
          path: 'algorithms.py',
          content: `def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\n\ndef factorial(n):\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result\n\n\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n`,
        },
      ],
    },
    {
      id: 'oop',
      name: 'Classes (OOP)',
      description: 'Inheritance example with a base class and subclasses.',
      files: [
        {
          path: 'main.py',
          content: `from models import Dog, Cat\n\nanimals = [Dog("Rex"), Cat("Whiskers")]\nfor animal in animals:\n    print(f"{animal.name} says {animal.speak()}")\n`,
        },
        {
          path: 'models.py',
          content: `class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        raise NotImplementedError\n\n\nclass Dog(Animal):\n    def speak(self):\n        return "Woof"\n\n\nclass Cat(Animal):\n    def speak(self):\n        return "Meow"\n`,
        },
      ],
    },
  ],

  website: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'A blank page wired up with Tailwind, CSS and JS.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Site</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body class="min-h-screen bg-slate-50 text-slate-800">\n  <main class="max-w-2xl mx-auto p-10">\n    <h1 class="text-4xl font-bold text-indigo-600">Hello, world</h1>\n    <p class="mt-3 text-lg">Edit <code class="bg-slate-200 px-1 rounded">index.html</code> and watch the live preview update.</p>\n    <button id="btn" class="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">\n      Click me\n    </button>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
        },
        {
          path: 'styles.css',
          content: `/* Custom styles layered on top of Tailwind */\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n}\n`,
        },
        {
          path: 'script.js',
          content: `document.getElementById('btn').addEventListener('click', () => {\n  alert('It works!');\n});\n`,
        },
      ],
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'A product landing page: hero, features and CTA.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Nimbus — Landing</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body class="bg-white text-slate-800">\n  <header class="border-b border-slate-100">\n    <nav class="max-w-5xl mx-auto flex items-center justify-between p-5">\n      <span class="text-xl font-bold text-indigo-600">Nimbus</span>\n      <a href="#cta" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Get started</a>\n    </nav>\n  </header>\n\n  <section class="max-w-3xl mx-auto px-5 py-24 text-center">\n    <h1 class="text-5xl font-extrabold tracking-tight">Ship faster with <span class="text-indigo-600">Nimbus</span></h1>\n    <p class="mt-5 text-lg text-slate-500">The all-in-one toolkit that helps your team build and launch products in record time.</p>\n    <a href="#cta" class="inline-block mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Start free trial</a>\n  </section>\n\n  <section class="max-w-5xl mx-auto px-5 py-16 grid gap-8 md:grid-cols-3">\n    <div class="p-6 rounded-2xl border border-slate-100 shadow-sm">\n      <h3 class="font-semibold text-lg">Fast</h3>\n      <p class="mt-2 text-slate-500">Blazing performance out of the box.</p>\n    </div>\n    <div class="p-6 rounded-2xl border border-slate-100 shadow-sm">\n      <h3 class="font-semibold text-lg">Simple</h3>\n      <p class="mt-2 text-slate-500">An intuitive API your team will love.</p>\n    </div>\n    <div class="p-6 rounded-2xl border border-slate-100 shadow-sm">\n      <h3 class="font-semibold text-lg">Scalable</h3>\n      <p class="mt-2 text-slate-500">Grows with you from day one.</p>\n    </div>\n  </section>\n\n  <section id="cta" class="bg-indigo-600 text-white text-center py-20 px-5">\n    <h2 class="text-3xl font-bold">Ready to dive in?</h2>\n    <p class="mt-3 text-indigo-100">Join thousands of teams already building with Nimbus.</p>\n    <button id="cta-btn" class="mt-6 px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50">Create account</button>\n  </section>\n\n  <footer class="text-center text-sm text-slate-400 py-8">© <span id="year"></span> Nimbus, Inc.</footer>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
        },
        {
          path: 'styles.css',
          content: `html {\n  scroll-behavior: smooth;\n}\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n}\n`,
        },
        {
          path: 'script.js',
          content: `document.getElementById('year').textContent = new Date().getFullYear();\ndocument.getElementById('cta-btn').addEventListener('click', () => {\n  alert('Thanks for signing up!');\n});\n`,
        },
      ],
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'An admin layout with a sidebar, stat cards and a table.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Dashboard</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body class="bg-slate-100 text-slate-800">\n  <div class="flex min-h-screen">\n    <aside class="w-56 bg-slate-900 text-slate-200 p-5 hidden sm:block">\n      <h1 class="text-lg font-bold text-white">Acme</h1>\n      <nav class="mt-8 space-y-1 text-sm">\n        <a class="block rounded-lg bg-slate-800 px-3 py-2" href="#">Overview</a>\n        <a class="block rounded-lg px-3 py-2 hover:bg-slate-800" href="#">Customers</a>\n        <a class="block rounded-lg px-3 py-2 hover:bg-slate-800" href="#">Reports</a>\n        <a class="block rounded-lg px-3 py-2 hover:bg-slate-800" href="#">Settings</a>\n      </nav>\n    </aside>\n\n    <main class="flex-1 p-8">\n      <h2 class="text-2xl font-bold">Overview</h2>\n\n      <div class="mt-6 grid gap-4 sm:grid-cols-3">\n        <div class="rounded-2xl bg-white p-5 shadow-sm">\n          <p class="text-sm text-slate-500">Revenue</p>\n          <p class="mt-1 text-2xl font-bold">$42.5k</p>\n        </div>\n        <div class="rounded-2xl bg-white p-5 shadow-sm">\n          <p class="text-sm text-slate-500">Users</p>\n          <p class="mt-1 text-2xl font-bold">1,280</p>\n        </div>\n        <div class="rounded-2xl bg-white p-5 shadow-sm">\n          <p class="text-sm text-slate-500">Churn</p>\n          <p class="mt-1 text-2xl font-bold">2.1%</p>\n        </div>\n      </div>\n\n      <div class="mt-8 rounded-2xl bg-white p-5 shadow-sm">\n        <h3 class="font-semibold">Recent orders</h3>\n        <table class="mt-4 w-full text-sm">\n          <thead class="text-left text-slate-400">\n            <tr><th class="py-2">Customer</th><th>Status</th><th>Total</th></tr>\n          </thead>\n          <tbody id="rows" class="divide-y divide-slate-100"></tbody>\n        </table>\n      </div>\n    </main>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
        },
        {
          path: 'styles.css',
          content: `body {\n  font-family: system-ui, -apple-system, sans-serif;\n}\n`,
        },
        {
          path: 'script.js',
          content: `const orders = [\n  { customer: 'Jane Cooper', status: 'Paid', total: '$120' },\n  { customer: 'Cody Fisher', status: 'Pending', total: '$80' },\n  { customer: 'Esther Howard', status: 'Paid', total: '$240' },\n];\n\nconst rows = document.getElementById('rows');\nrows.innerHTML = orders\n  .map(\n    (o) => \`<tr><td class="py-2">\${o.customer}</td><td>\${o.status}</td><td>\${o.total}</td></tr>\`,\n  )\n  .join('');\n`,
        },
      ],
    },
  ],
};

/** Returns the files for a given template id (falls back to the first template). */
export function templateFiles(type: ProjectType, id?: string): StarterFile[] {
  const list = TEMPLATES[type];
  const chosen = (id && list.find((t) => t.id === id)) || list[0];
  return chosen.files;
}

/** Lightweight metadata catalog (no file contents) for the template picker. */
export function templateCatalog(): Record<ProjectType, TemplateMeta[]> {
  const out = {} as Record<ProjectType, TemplateMeta[]>;
  (Object.keys(TEMPLATES) as ProjectType[]).forEach((type) => {
    out[type] = TEMPLATES[type].map(({ id, name, description }) => ({ id, name, description }));
  });
  return out;
}
