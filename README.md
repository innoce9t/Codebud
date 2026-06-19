# 🧠 CodeBud — AI-Powered Coding Workspace

A simplified, AI-assisted coding workspace where users create, manage, and interact with
coding projects across three environments — **JavaScript**, **Python**, and a
**Website Builder** (HTML/CSS/JS + Tailwind) — each with a real code editor, an
in-browser runtime, and a project-aware AI chat that can read and modify your files.

![stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20MongoDB%20%7C%20Socket.io-4f46e5)

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Auth** | Signup / login with bcrypt-hashed passwords and **httpOnly JWT cookies**. Every project is scoped to its owner. |
| **Workspaces** | Three card-based environments on the dashboard, each isolating its own projects. |
| **Projects** | Create / list / open / delete. New projects are seeded with runnable starter files. |
| **Editor** | Monaco editor with syntax highlighting, a nested **file explorer**, create / rename / delete, and **debounced autosave**. |
| **AI chat** | Per-project chat history. The AI sees all project files, answers questions, suggests improvements, and **creates/updates/deletes files** via a structured edit protocol. Pluggable provider (**Claude / OpenAI / mock**). |
| **Run & preview** | **JS** runs sandboxed in an iframe with module-import resolution; **Python** runs in-browser via **Pyodide**; **websites** get an instant **live preview**. |
| **Realtime** | Socket.io broadcasts file changes and live keystrokes to collaborators in the same project. |
| **Version history** | Every save snapshots the previous content; browse and **restore** any prior version. |

---

## 🏗️ Architecture

```
codebud/
├─ server/                 # Express + TypeScript API
│  └─ src/
│     ├─ config/           # env + Mongo connection
│     ├─ models/           # User, Project, File (with versions), ChatMessage
│     ├─ middleware/       # auth (JWT), error handling
│     ├─ routes/           # auth, projects, files, chat
│     ├─ services/
│     │  ├─ ai/            # provider abstraction (anthropic | openai | mock) + edit protocol
│     │  └─ fileService.ts # apply edits with version history
│     └─ realtime/         # Socket.io (rooms per project)
└─ client/                 # Vite + React + TypeScript + Tailwind
   └─ src/
      ├─ pages/            # AuthPage, Dashboard, Workspace, Editor
      ├─ components/       # FileExplorer, CodeEditor, ChatPanel, OutputPanel, VersionHistory
      └─ runners/          # website preview, JS module runner, Python (Pyodide)
```

**AI edit protocol:** the model replies in markdown and emits fenced blocks
` ```codebud path="src/x.js" action="update" ` containing the full new file
contents. The server parses these out, applies them with version history, and
notifies connected clients over Socket.io. See `server/src/services/ai/prompt.ts`.

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI

### 1. Configure
```bash
cp .env.example .env
```
The defaults work out of the box with a local MongoDB and the **mock AI provider**
(no API key needed). To enable real AI:
```ini
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# or
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 2. Install
```bash
npm install            # installs both workspaces (server + client)
```

### 3. Run (dev)
```bash
npm run dev            # starts API (:4000) and Vite client (:5173) together
```
Open **http://localhost:5173**.

### Build for production
```bash
npm run build
npm start              # serves the compiled API
```

---

## 🐳 Run with Docker

The repo ships a production-style stack — **MongoDB**, the **API**, and the
**client served by nginx** (which reverse-proxies `/api` and `/socket.io` to the
API, so everything is same-origin).

```bash
docker compose up -d --build
```

Then open **http://localhost:8080**.

- No local Node or MongoDB needed — only Docker.
- Defaults to the **mock AI provider**. To enable real AI, create a `.env` in the
  repo root (Compose reads it automatically):
  ```ini
  AI_PROVIDER=anthropic
  ANTHROPIC_API_KEY=sk-ant-...
  JWT_SECRET=please-change-me
  ```
- Mongo data persists in the `mongo-data` volume.

```bash
docker compose logs -f server   # tail API logs
docker compose down             # stop (add -v to also wipe the DB volume)
```

> The compose setup serves over plain HTTP, so it sets `COOKIE_SECURE=false`.
> Behind HTTPS in real production, drop that override so auth cookies require TLS.

---

## 🔌 API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` \| `/login` \| `/logout` | Auth |
| `GET` | `/api/auth/me` | Current user |
| `GET/POST` | `/api/projects` | List / create projects |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Read / update / delete a project |
| `GET/POST` | `/api/projects/:id/files` | List / create files |
| `PUT/PATCH/DELETE` | `/api/projects/:id/files/:fileId` | Save / rename / delete |
| `GET/POST` | `/api/projects/:id/files/:fileId/versions` · `/restore` | Version history |
| `GET/POST/DELETE` | `/api/projects/:id/chat` | Chat history / send / clear |

All project/file/chat routes require auth and verify ownership.

---

## 🧪 Try it
1. Sign up.
2. Open the **JavaScript** card → **New project**.
3. Hit **▶ Run** to execute `index.js` (note the cross-file `import` from `utils.js`).
4. In the AI panel, type *"create a file called math.js with an add function"* — watch it appear in the explorer.
5. Open the **Website Builder** card and edit `index.html` to see the **live preview** update.

---

## 📝 Notes & trade-offs
- **Code execution is client-side and sandboxed** (iframe for JS, Pyodide/WASM for Python). This avoids a risky server-side sandbox while still giving real execution.
- File storage is path-based, which supports nested folders without a separate collection.
- Version history is capped (30 snapshots/file) to bound document growth.
