# CodeBud — AI-Powered Collaborative Coding Workspace

> A full-stack, AI-assisted online IDE where users build and run **JavaScript**, **Python**,
> and **website** projects in the browser, with a project-aware AI assistant that can read and
> edit their code, real-time collaboration, and live in-browser execution.

**Live demo:** https://codebud-598265206881.us-central1.run.app
**Source:** https://github.com/innoce9t/Codebud
**Role:** Sole full-stack developer (design, frontend, backend, infra, deployment)

---

## Overview

CodeBud is a browser-based coding workspace built around three isolated environments — a
JavaScript workspace, a Python workspace, and a Tailwind-powered website builder. Each project
has a real code editor, a file explorer, an in-browser runtime, and an AI chat that understands
the project's files and can modify them. It supports real-time multi-user collaboration, link/email
sharing, per-file version history, and a pluggable set of AI providers (Claude, GPT, Gemini, or a
custom/local model). It's shipped as an installable PWA and deployed to Google Cloud Run.

---

## Key features

- **Authentication & isolation** — email/password auth with bcrypt hashing and httpOnly JWT
  cookies; every project is scoped to its owner and explicit collaborators. Includes a password-reset flow.
- **Three workspaces & project management** — create projects from quick-start templates,
  with search / owner-filter / sort across the dashboard, multi-file projects, cross-file imports,
  and a nested folder structure.
- **Code editor & file system** — Monaco editor, file explorer (create / rename / delete / upload),
  debounced autosave to MongoDB, and AI **inline ghost-text completions**.
- **AI assistant** — per-project chat sessions that see all project files, answer questions,
  suggest improvements, and **create/update/delete files** through a structured edit protocol.
  Three modes (**Ask** / **Plan** / **Agent**) with an approval step before edits apply.
- **Configurable AI** — connect Claude / GPT / Gemini keys or a **custom OpenAI-compatible / local
  endpoint**; tune temperature, top-P, max tokens, response style, and a persistent system behaviour.
- **In-browser execution** — JavaScript runs in a sandboxed iframe with ES-module resolution;
  Python runs via **Pyodide (CPython→WASM)**; websites get an instant **live preview**.
- **Real-time collaboration** — Socket.io broadcasts file changes and live presence to everyone in
  a project room.
- **Sharing** — invite collaborators by email or enable Google-Docs-style "anyone with the link" access.
- **Version history** — every save snapshots the file; browse and restore any prior version.
- **Personalization & PWA** — light/dark/system themes with preset and custom accent colors,
  remappable keyboard shortcuts, responsive mobile layout, and offline-capable PWA install.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Monaco Editor |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | MongoDB (Mongoose) |
| Realtime | Socket.io (optional Redis adapter for multi-instance) |
| AI | Anthropic / OpenAI / Google Gemini SDKs + custom OpenAI-compatible endpoints |
| In-browser runtimes | Pyodide (Python/WASM), sandboxed iframes (JS & website preview) |
| Auth/Security | bcrypt, JWT (httpOnly cookies), AES-256-GCM encrypted provider keys |
| Testing | node:test + supertest + mongodb-memory-server |
| Deployment | Docker (multi-stage), Google Cloud Run, Cloud Build, Secret Manager |

---

## Architecture highlights

- **Clean client/server separation** with a feature-organized backend (models / routes / services /
  realtime / middleware) and a pluggable **AI provider abstraction** that hides Anthropic, OpenAI,
  Gemini, custom, and a mock provider behind a single interface.
- **Stateless API** (JWT in httpOnly cookies) so it scales horizontally; MongoDB documents are
  indexed (including compound unique indexes) for efficient ownership/path lookups.
- **Single-container production image** — the Express server serves the REST API, Socket.io, *and*
  the built React client on one port, deployed to Cloud Run with secrets in Secret Manager.

---

## Engineering decisions & problems solved

These are the parts I'm most proud of — each was a real design/debugging challenge:

- **Safe code execution without a server sandbox.** Rather than run untrusted user code on the
  server, execution happens entirely client-side in sandboxed iframes (JS) and Pyodide/WASM (Python).
  This removes a major attack surface while still giving users real output.
- **A structured AI edit protocol.** The AI returns markdown plus fenced ` ```codebud ` blocks that
  declare file create/update/delete operations. The server parses these, applies them with version
  history, and broadcasts changes — giving the assistant safe, reviewable write access to the project.
- **Prompt-injection hardening.** Because the AI can take app-level actions, I sanitized untrusted
  file content so embedded directives can't be executed, scoped actions to the general chat, and kept
  destructive actions behind a confirmation modal.
- **Reliable website preview in a locked-down sandbox.** The preview iframe is sandboxed *without*
  `allow-same-origin` (so untrusted/collaborator code can't reach the app), which meant it couldn't
  load Tailwind as a cross-origin script — leaving the preview blank. I diagnosed it down to the
  render-blocking script and fixed it by **inlining Tailwind directly into the preview document**, so
  it renders offline and behind ad-blockers with the security sandbox intact.
- **Multi-instance realtime.** Presence is derived from Socket.io room membership (adapter-aware) with
  an optional Redis adapter, so collaboration works correctly across multiple Cloud Run instances.
- **Encrypted secrets.** Provider API keys are encrypted at rest (AES-256-GCM); only the last four
  characters are ever returned to the client.

---

## Testing

API test suite (`node:test` + `supertest`) running against an in-memory MongoDB, covering auth
sessions, route guards, input validation, project CRUD, and per-user data isolation. Run with
`npm test` in `server/`.

---

## Possible next steps

Redis-backed realtime in production, rate limiting on auth/AI endpoints, an in-browser interactive
REPL/terminal, and broader automated test coverage.

---

*Built end-to-end by me — product/UX, React frontend, Express/MongoDB backend, AI integration,
real-time collaboration, in-browser runtimes, Dockerization, and Cloud Run deployment.*
