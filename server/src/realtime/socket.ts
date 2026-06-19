import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { Project } from '../models/Project.js';

let io: IOServer | null = null;

interface AuthedSocket extends Socket {
  userId?: string;
}

export function initRealtime(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Authenticate the socket from the JWT cookie or auth token.
  io.use((socket: AuthedSocket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const token =
        (raw && cookie.parse(raw)[COOKIE_NAME]) ||
        (socket.handshake.auth?.token as string | undefined);
      if (!token) return next(new Error('unauthorized'));
      socket.userId = verifyToken(token).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    // Join a project room (after verifying ownership).
    socket.on('project:join', async (projectId: string) => {
      const project = await Project.findById(projectId).catch(() => null);
      if (!project || String(project.owner) !== socket.userId) return;
      socket.join(room(projectId));
      socket.to(room(projectId)).emit('presence:join', { userId: socket.userId });
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(room(projectId));
      socket.to(room(projectId)).emit('presence:leave', { userId: socket.userId });
    });

    // Live, un-persisted keystroke broadcast for collaborative editing.
    socket.on(
      'editor:change',
      (data: { projectId: string; fileId: string; content: string }) => {
        socket.to(room(data.projectId)).emit('editor:change', {
          fileId: data.fileId,
          content: data.content,
          userId: socket.userId,
        });
      },
    );
  });

  return io;
}

const room = (projectId: string) => `project:${projectId}`;

/** Emit an event to everyone in a project room (REST-side changes). */
export function emitToProject(
  projectId: string,
  event: string,
  payload: unknown,
  _req?: unknown,
): void {
  io?.to(room(projectId)).emit(event, payload);
}
