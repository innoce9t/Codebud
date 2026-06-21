# syntax=docker/dockerfile:1
#
# Single-container image for Cloud Run / any PaaS: the Express server serves the
# REST API, Socket.io, AND the built React client on one port ($PORT, default 8080).
#
# Build from the repo root:   docker build -t codebud .
# Run locally:                docker run -p 8080:8080 --env-file .env codebud

# ── Build the server (TypeScript → dist) ───────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# ── Build the client (Vite → dist) ─────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ── Runtime: Express serves the API + the built client ─────────────
FROM node:20-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=8080
# Server production dependencies only (server/package.json is standalone).
COPY server/package.json ./
RUN npm install --omit=dev && npm cache clean --force
# Compiled server and built client. app.ts resolves the client at ../../client/dist
# relative to /app/server/dist, i.e. /app/client/dist.
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist /app/client/dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
