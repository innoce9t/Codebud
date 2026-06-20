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
      id: 'digital-clock',
      name: 'Digital Clock',
      description: 'A live digital clock that updates every second.',
      files: [
        {
          path: 'index.js',
          content: `function getTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return \`\${pad(now.getHours())}:\${pad(now.getMinutes())}:\${pad(now.getSeconds())}\`;
}

function tick() {
  console.log(getTime());
}

tick();
setInterval(tick, 1000);
`,
        },
      ],
    },
    {
      id: 'random-quote',
      name: 'Random Quote Generator',
      description: 'Picks and displays a random inspirational quote.',
      files: [
        {
          path: 'index.js',
          content: `import { getRandomQuote } from './quotes.js';

console.log(getRandomQuote());
`,
        },
        {
          path: 'quotes.js',
          content: `const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Life is what happens when you are busy making other plans.', author: 'John Lennon' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
];

export function getRandomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return \`"\${q.text}" — \${q.author}\`;
}
`,
        },
      ],
    },
    {
      id: 'calculator',
      name: 'Simple Calculator',
      description: 'A calculator supporting +, -, *, / operations.',
      files: [
        {
          path: 'index.js',
          content: `import { calculate } from './calculator.js';

console.log('10 + 5 =', calculate(10, '+', 5));
console.log('10 - 3 =', calculate(10, '-', 3));
console.log('6 * 7 =', calculate(6, '*', 7));
console.log('20 / 4 =', calculate(20, '/', 4));
console.log('5 / 0 =', calculate(5, '/', 0));
`,
        },
        {
          path: 'calculator.js',
          content: `export function calculate(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? 'Error: division by zero' : a / b;
    default: return \`Error: unknown operator "\${op}"\`;
  }
}
`,
        },
      ],
    },
  ],

  python: [
    {
      id: 'number-guessing',
      name: 'Number Guessing Game',
      description: 'Guess the secret number with hints until you get it right.',
      files: [
        {
          path: 'main.py',
          content: `from game import play

play()
`,
        },
        {
          path: 'game.py',
          content: `import random

def play():
    secret = random.randint(1, 100)
    attempts = 0
    print("Guess the number between 1 and 100!")

    while True:
        try:
            guess = int(input("Your guess: "))
        except ValueError:
            print("Please enter a valid number.")
            continue

        attempts += 1

        if guess < secret:
            print("Too low! Try higher.")
        elif guess > secret:
            print("Too high! Try lower.")
        else:
            print(f"Correct! You got it in {attempts} attempt(s).")
            break
`,
        },
      ],
    },
    {
      id: 'password-generator',
      name: 'Random Password Generator',
      description: 'Generates strong random passwords with custom length and rules.',
      files: [
        {
          path: 'main.py',
          content: `from generator import generate_password

print("Generated passwords:")
for length in [8, 12, 16]:
    print(f"  {length} chars: {generate_password(length)}")
`,
        },
        {
          path: 'generator.py',
          content: `import random
import string

def generate_password(length=12, use_upper=True, use_digits=True, use_symbols=True):
    chars = string.ascii_lowercase
    required = [random.choice(string.ascii_lowercase)]

    if use_upper:
        chars += string.ascii_uppercase
        required.append(random.choice(string.ascii_uppercase))
    if use_digits:
        chars += string.digits
        required.append(random.choice(string.digits))
    if use_symbols:
        chars += string.punctuation
        required.append(random.choice(string.punctuation))

    remaining = [random.choice(chars) for _ in range(length - len(required))]
    password = required + remaining
    random.shuffle(password)
    return ''.join(password)
`,
        },
      ],
    },
    {
      id: 'todo-list',
      name: 'To-Do List App',
      description: 'A command-line to-do list to add, complete, and view tasks.',
      files: [
        {
          path: 'main.py',
          content: `from todo import TodoList

app = TodoList()
app.add("Buy groceries")
app.add("Read a book")
app.add("Go for a walk")
app.complete(0)
app.show()
`,
        },
        {
          path: 'todo.py',
          content: `class TodoList:
    def __init__(self):
        self.tasks = []

    def add(self, text):
        self.tasks.append({"text": text, "done": False})
        print(f'Added: "{text}"')

    def complete(self, index):
        if 0 <= index < len(self.tasks):
            self.tasks[index]["done"] = True
            print(f'Completed: "{self.tasks[index]["text"]}"')
        else:
            print("Invalid task index.")

    def show(self):
        print("\\n--- To-Do List ---")
        if not self.tasks:
            print("No tasks yet.")
            return
        for i, task in enumerate(self.tasks):
            status = "x" if task["done"] else " "
            print(f"[{status}] {i}. {task['text']}")
        remaining = sum(1 for t in self.tasks if not t["done"])
        print(f"\\n{remaining} task(s) remaining.")
`,
        },
      ],
    },
  ],

  website: [
    {
      id: 'modal-popup',
      name: 'Modal Popup Window',
      description: 'A responsive modal dialog with open/close animations.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modal Popup</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="min-h-screen bg-slate-100 flex items-center justify-center">
  <button id="open-btn" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">
    Open Modal
  </button>

  <div id="overlay" class="fixed inset-0 bg-black/50 hidden items-center justify-center">
    <div id="modal" class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 scale-95 opacity-0 transition-all duration-200">
      <h2 class="text-xl font-bold text-slate-800">Hello from the Modal!</h2>
      <p class="mt-2 text-slate-500">This is a simple popup window. Click the button below or the backdrop to close.</p>
      <div class="mt-6 flex justify-end">
        <button id="close-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Close
        </button>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
`,
        },
        {
          path: 'styles.css',
          content: `body {
  font-family: system-ui, -apple-system, sans-serif;
}

#overlay.flex {
  display: flex;
}
`,
        },
        {
          path: 'script.js',
          content: `const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const openBtn = document.getElementById('open-btn');
const closeBtn = document.getElementById('close-btn');

function openModal() {
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  requestAnimationFrame(() => {
    modal.classList.remove('scale-95', 'opacity-0');
    modal.classList.add('scale-100', 'opacity-100');
  });
}

function closeModal() {
  modal.classList.remove('scale-100', 'opacity-100');
  modal.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }, 200);
}

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
`,
        },
      ],
    },
    {
      id: 'dark-mode-toggle',
      name: 'Dark/Light Mode Toggle',
      description: 'A page that switches between dark and light themes with one click.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dark/Light Mode</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="container">
    <h1>Dark / Light Mode Toggle</h1>
    <p>Click the button below to switch between themes.</p>
    <button id="toggle-btn">Switch to Dark Mode</button>
    <div class="card">
      <h2>Sample Card</h2>
      <p>This card adapts to the current theme automatically.</p>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>
`,
        },
        {
          path: 'styles.css',
          content: `/* Light theme (default) */
:root[data-theme="light"] {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #1e293b;
  --subtext: #64748b;
  --border: #e2e8f0;
  --btn-bg: #4f46e5;
  --btn-text: #ffffff;
}

/* Dark theme */
:root[data-theme="dark"] {
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f1f5f9;
  --subtext: #94a3b8;
  --border: #334155;
  --btn-bg: #6366f1;
  --btn-text: #ffffff;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  transition: background 0.3s, color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 480px;
  width: 100%;
  padding: 2rem;
  text-align: center;
}

h1 { font-size: 1.75rem; font-weight: 700; }
p { color: var(--subtext); margin-top: 0.5rem; }

#toggle-btn {
  margin-top: 1.5rem;
  padding: 0.6rem 1.4rem;
  background: var(--btn-bg);
  color: var(--btn-text);
  border: none;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
#toggle-btn:hover { opacity: 0.85; }

.card {
  margin-top: 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  text-align: left;
  transition: background 0.3s, border-color 0.3s;
}
.card h2 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem; }
.card p { margin: 0; }
`,
        },
        {
          path: 'script.js',
          content: `const root = document.documentElement;
const btn = document.getElementById('toggle-btn');

btn.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  btn.textContent = isDark ? 'Switch to Dark Mode' : 'Switch to Light Mode';
});
`,
        },
      ],
    },
    {
      id: 'quiz-app',
      name: 'Interactive Quiz App',
      description: 'A multi-question quiz with score tracking and instant feedback.',
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quiz App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
  <div class="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
    <div id="quiz-screen">
      <div class="flex justify-between items-center mb-6">
        <span id="question-counter" class="text-sm font-medium text-slate-400"></span>
        <span id="score-display" class="text-sm font-semibold text-indigo-600"></span>
      </div>
      <h2 id="question-text" class="text-xl font-bold text-slate-800 mb-6"></h2>
      <div id="options" class="space-y-3"></div>
      <div id="feedback" class="mt-4 text-sm font-medium hidden"></div>
      <button id="next-btn" class="mt-6 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition hidden">
        Next Question
      </button>
    </div>

    <div id="result-screen" class="text-center hidden">
      <h2 class="text-2xl font-bold text-slate-800">Quiz Complete!</h2>
      <p id="final-score" class="mt-3 text-5xl font-extrabold text-indigo-600"></p>
      <p id="result-msg" class="mt-2 text-slate-500"></p>
      <button id="restart-btn" class="mt-8 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">
        Try Again
      </button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>
`,
        },
        {
          path: 'styles.css',
          content: `body {
  font-family: system-ui, -apple-system, sans-serif;
}

.option-btn {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  color: #1e293b;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.option-btn:hover:not(:disabled) {
  border-color: #6366f1;
  background: #eef2ff;
}
.option-btn.correct {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #15803d;
}
.option-btn.wrong {
  border-color: #ef4444;
  background: #fef2f2;
  color: #b91c1c;
}
`,
        },
        {
          path: 'script.js',
          content: `const QUESTIONS = [
  {
    question: 'What does HTML stand for?',
    options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Logic', 'Home Tool Markup Language'],
    answer: 0,
  },
  {
    question: 'Which CSS property changes the text color?',
    options: ['font-color', 'text-color', 'color', 'foreground'],
    answer: 2,
  },
  {
    question: 'Which keyword declares a constant in JavaScript?',
    options: ['var', 'let', 'const', 'static'],
    answer: 2,
  },
  {
    question: 'What does the "box model" in CSS include?',
    options: ['margin, border, padding, content', 'header, footer, sidebar, main', 'width, height, color, font', 'grid, flex, block, inline'],
    answer: 0,
  },
  {
    question: 'Which method adds an element to the end of an array in JavaScript?',
    options: ['append()', 'push()', 'insert()', 'add()'],
    answer: 1,
  },
];

let current = 0;
let score = 0;

const questionText = document.getElementById('question-text');
const optionsEl = document.getElementById('options');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');
const counter = document.getElementById('question-counter');
const scoreDisplay = document.getElementById('score-display');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const finalScore = document.getElementById('final-score');
const resultMsg = document.getElementById('result-msg');
const restartBtn = document.getElementById('restart-btn');

function loadQuestion() {
  const q = QUESTIONS[current];
  counter.textContent = \`Question \${current + 1} of \${QUESTIONS.length}\`;
  scoreDisplay.textContent = \`Score: \${score}\`;
  questionText.textContent = q.question;
  feedbackEl.classList.add('hidden');
  nextBtn.classList.add('hidden');

  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectAnswer(i, btn));
    optionsEl.appendChild(btn);
  });
}

function selectAnswer(index, btn) {
  const q = QUESTIONS[current];
  document.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true));

  if (index === q.answer) {
    btn.classList.add('correct');
    score++;
    feedbackEl.textContent = 'Correct!';
    feedbackEl.className = 'mt-4 text-sm font-medium text-green-600';
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.option-btn')[q.answer].classList.add('correct');
    feedbackEl.textContent = 'Wrong — see the correct answer above.';
    feedbackEl.className = 'mt-4 text-sm font-medium text-red-600';
  }

  feedbackEl.classList.remove('hidden');
  nextBtn.classList.remove('hidden');
  nextBtn.textContent = current < QUESTIONS.length - 1 ? 'Next Question' : 'See Results';
}

nextBtn.addEventListener('click', () => {
  current++;
  if (current < QUESTIONS.length) {
    loadQuestion();
  } else {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    finalScore.textContent = \`\${score} / \${QUESTIONS.length}\`;
    const pct = (score / QUESTIONS.length) * 100;
    resultMsg.textContent = pct === 100 ? 'Perfect score!' : pct >= 60 ? 'Good job!' : 'Keep practising!';
  }
});

restartBtn.addEventListener('click', () => {
  current = 0;
  score = 0;
  quizScreen.classList.remove('hidden');
  resultScreen.classList.add('hidden');
  loadQuestion();
});

loadQuestion();
`,
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
