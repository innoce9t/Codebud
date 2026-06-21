# 🧠 CodeBud — AI-Powered Coding Workspace

A simplified, AI-assisted coding workspace where users create, manage, and interact with
coding projects across three environments — **JavaScript**, **Python**, and a
**Website Builder** (HTML/CSS/JS + Tailwind) — each with a real code editor, an
in-browser runtime, and a project-aware AI chat that can read and modify your files.

![stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20MongoDB%20%7C%20Socket.io-4f46e5)

**Live demo:** https://codebud-598265206881.us-central1.run.app
(running with the **mock** AI provider — connect your own Claude/OpenAI/Gemini key under
Settings → AI Settings to enable real AI).

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Auth** | Signup / login with bcrypt-hashed passwords and **httpOnly JWT cookies**; password reset flow. Every project is scoped to its owner/collaborators. |
| **Workspaces** | Three card-based environments (JavaScript / Python / Website). Browse projects with **search, owner filter, and sort** on both the overview and per-type pages. |
| **Projects** | Create / list / open / delete, each seeded from selectable **quick-start templates**. File type is validated per workspace. |
| **Editor** | Monaco editor, nested **file explorer** (create / rename / delete / **upload**), **debounced autosave**, and **predictive inline AI completions** (ghost text). Dedicated single-pane tabbed layout on mobile. |
| **AI chat** | Per-project chat sessions (history retained per project) plus a general app-wide chat. The AI reads all project files, answers questions, suggests improvements, and **creates/updates/deletes files** via a structured edit protocol. **Ask / Plan / Agent** modes, with optional approval before edits apply. |
| **AI providers & tuning** | Connect **Claude, GPT, or Gemini** keys, or a **custom OpenAI-compatible / local endpoint** (Ollama, LM Studio, vLLM). Tune **temperature, top-P, max tokens, response style, and a custom system behaviour** — applied to every request. Keys are AES-256-GCM encrypted at rest. |
| **Run & preview** | **JS** runs sandboxed in an iframe with module-import resolution; **Python** runs in-browser via **Pyodide**; **websites** get an instant **live preview** (Tailwind inlined into the sandboxed iframe so it works offline / behind ad-blockers). |
| **Realtime** | Socket.io broadcasts file changes and live presence to collaborators in the same project. |
| **Sharing** | Invite collaborators by email, or enable a Google-Docs-style **"anyone with the link"** share; add/remove people and revoke the link. |
| **Version history** | Every save snapshots the previous content; browse and **restore** any prior version. |
| **Personalization** | Light / dark / system theme with preset **and custom** accent colors; configurable editor preferences and **remappable keyboard shortcuts**. |
| **PWA & mobile** | Installable Progressive Web App (manifest + service worker) with a responsive, mobile-friendly UI. |

---

## 🏗️ Architecture

```
codebud/
├─ server/                 # Express + TypeScript API
│  └─ src/
│     ├─ config/           # env + Mongo connection
│     ├─ models/           # User, Project, File (with versions), ChatMessage, Session, ProviderKey
│     ├─ middleware/       # auth (JWT), error handling
│     ├─ routes/           # auth, projects, files, chat, sessions, ai, complete, templates, helpers
│     ├─ services/
│     │  ├─ ai/            # provider abstraction (anthropic | openai | google | custom | mock),
│     │  │                 #   prompt building, edit-protocol parsing, model catalog, resolve
│     │  └─ fileService.ts # apply edits with version history
│     ├─ realtime/         # Socket.io (rooms per project, presence)
│     └─ utils/            # crypto (AES-256-GCM), jwt, http helpers
└─ client/                 # Vite + React + TypeScript + Tailwind
   └─ src/
      ├─ pages/            # Auth, Dashboard, NewProject, Workspace(s), Editor, Settings, Theme, AiModels, Profile, Docs
      ├─ components/       # FileExplorer, CodeEditor, GlobalChatDrawer, OutputPanel, VersionHistory, ShareModal, ui
      ├─ context/          # ChatContext (drawer + session state)
      ├─ hooks/            # useResizable, useIsMobile
      ├─ runners/          # website preview, JS module runner, Python (Pyodide)
      └─ theme.tsx, auth.tsx, api.ts, keybindings.ts
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

### Option A — MongoDB Atlas (default)
Put your Atlas connection string in a root `.env` (Compose reads it automatically):
```ini
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/codebud?retryWrites=true&w=majority
JWT_SECRET=please-change-me
AI_PROVIDER=mock          # or anthropic / openai
ANTHROPIC_API_KEY=sk-ant-...
```
Then:
```bash
docker compose up -d --build
```
Make sure your machine's IP is allowlisted in **Atlas → Network Access**.

### Option B — local MongoDB container (no Atlas)
Spin up a bundled MongoDB instead, via the `local-db` profile:
```bash
docker compose --profile local-db up -d --build
```
If `MONGODB_URI` is unset, the server falls back to the `mongo` container, whose
data persists in the `mongo-data` volume.

Either way, open **http://localhost:8080** — no local Node needed, only Docker.

```bash
docker compose logs -f server   # tail API logs
docker compose down             # stop (add -v to also wipe the DB volume)
```

> The compose setup serves over plain HTTP, so it sets `COOKIE_SECURE=false`.
> Behind HTTPS in real production, drop that override so auth cookies require TLS.

---

## ☁️ Deploy to Google Cloud Run

Cloud Run runs **one container per service**, so the repo also ships a **combined
image** (root [`Dockerfile`](Dockerfile)): the Express server serves the REST API,
Socket.io, **and** the built React client on a single port (`$PORT`, default `8080`).
This is separate from the multi-container Compose setup above and doesn't affect it.

### Build & run the combined image locally
```bash
docker build -t codebud .
docker run -p 8080:8080 --env-file .env codebud
# open http://localhost:8080
```

### Deploy
Requires the **gcloud CLI** (`gcloud` — install from https://cloud.google.com/sdk)
and a MongoDB Atlas URI (Cloud Run is stateless; use Atlas, not a local DB). The
target GCP project is **`gen-lang-client-0536773966`** (the "Demos" project).

The simplest path is the bundled [`deploy.sh`](deploy.sh). It enables the needed
APIs, stores secrets in Secret Manager, builds from source via Cloud Build (no local
Docker), deploys, then wires `CLIENT_ORIGIN` to the live URL:

```bash
gcloud auth login                      # one-time
# Demo deploy (mock AI — only the DB is required):
MONGODB_URI='mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/codebud' ./deploy.sh

# Real AI instead:
AI_PROVIDER=anthropic ANTHROPIC_API_KEY='sk-ant-...' \
MONGODB_URI='mongodb+srv://...' ./deploy.sh
```

<details><summary>Equivalent raw gcloud commands</summary>

```bash
gcloud config set project gen-lang-client-0536773966
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
printf '%s' 'mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/codebud' | gcloud secrets create MONGODB_URI --data-file=-
printf '%s' 'a-long-random-string'                                      | gcloud secrets create JWT_SECRET  --data-file=-

gcloud run deploy codebud \
  --source . --region us-central1 --allow-unauthenticated --port 8080 --session-affinity \
  --set-env-vars NODE_ENV=production,AI_PROVIDER=mock \
  --set-secrets MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest

# then point CLIENT_ORIGIN at the URL it printed:
gcloud run services update codebud --region us-central1 \
  --set-env-vars CLIENT_ORIGIN=https://codebud-XXXXXX.us-central1.run.app
```
</details>

Notes:
- **Atlas Network Access** must allow Cloud Run — add `0.0.0.0/0` (or use a VPC connector + Atlas Private Endpoint for production).
- `--session-affinity` keeps WebSocket (Socket.io) connections sticky to one instance.
- Cookies are `Secure` automatically (`NODE_ENV=production` over Cloud Run's HTTPS).

---

## 🔌 API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` \| `/login` \| `/logout` · `/forgot-password` · `/reset-password` | Auth |
| `GET/PATCH/DELETE` | `/api/auth/me` | Current user · update profile/preferences · delete account |
| `GET/POST` | `/api/projects` | List (with owner name) / create projects |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Read / rename / delete a project |
| `GET/POST` | `/api/projects/:id/files` | List / create files |
| `PUT/PATCH/DELETE` | `/api/projects/:id/files/:fileId` | Save / rename / delete |
| `GET/POST` | `/api/projects/:id/files/:fileId/versions` · `/restore` | Version history |
| `GET/POST/DELETE` | `/api/projects/:id/collaborators` · `/share` · `/join` | Sharing (email invite + link) |
| `POST` | `/api/projects/:id/complete` | Inline code completion (ghost text) |
| `GET/POST/DELETE` | `/api/sessions` · `/:id/messages` · `/apply` · `/pending` | AI chat sessions, messages, edit approval |
| `GET` | `/api/ai/catalog` · `PUT/DELETE /api/ai/providers/:p` · `PUT /api/ai/active` | Provider keys + active model |
| `GET` | `/api/templates` | Quick-start template catalog |

All project/file/chat/session routes require auth and verify ownership (or collaborator access).

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
- The website **live preview** runs in an iframe sandboxed *without* `allow-same-origin` (so untrusted project/collaborator code can't reach the app), and Tailwind is **inlined** into the preview document — no external CDN dependency, so it renders offline and behind ad-blockers.
- AI provider keys are **encrypted at rest** (AES-256-GCM); only the last 4 chars are ever returned to the client.
- File storage is path-based, which supports nested folders without a separate collection.
- Version history is capped (30 snapshots/file) to bound document growth.
