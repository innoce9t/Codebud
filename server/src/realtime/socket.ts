import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { Project } from '../models/Project.js';

let io: IOServer | null = null;

interface SocketData {
  userId?: string;
  email?: string;
  projectId?: string;
}
type AuthedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

interface Member {
  userId: string;
  email: string;
}

const room = (projectId: string) => `project:${projectId}`;

/**
 * Presence is derived from Socket.io room membership rather than a local Map, so it
 * works across instances when the Redis adapter is enabled — `fetchSockets()` returns
 * sockets from ALL instances. Members are de-duplicated by userId (multiple tabs = one).
 */
async function membersOf(projectId: string): Promise<Member[]> {
  if (!io) return [];
  const sockets = await io.in(room(projectId)).fetchSockets();
  const byUser = new Map<string, Member>();
  for (const s of sockets) {
    const { userId, email } = s.data as SocketData;
    if (userId) byUser.set(userId, { userId, email: email ?? '' });
  }
  return [...byUser.values()];
}

async function emitPresence(projectId: string) {
  if (!io) return;
  io.to(room(projectId)).emit('presence:sync', { members: await membersOf(projectId) });
}

export async function initRealtime(server: HttpServer): Promise<IOServer> {
  io = new IOServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Multi-instance realtime: route events through Redis when REDIS_URL is configured.
  // Imported dynamically so the dependency is only loaded when actually used.
  if (env.redisUrl) {
    try {
      const [{ createAdapter }, { createClient }] = await Promise.all([
        import('@socket.io/redis-adapter'),
        import('redis'),
      ]);
      const pub = createClient({ url: env.redisUrl });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      io.adapter(createAdapter(pub, sub));
      console.log('✓ Socket.io Redis adapter enabled (multi-instance realtime)');
    } catch (err) {
      console.warn('⚠ Redis adapter unavailable, using single-instance realtime:', (err as Error).message);
    }
  }

  // Authenticate the socket from the JWT cookie or auth token.
  io.use((socket: AuthedSocket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const token =
        (raw && cookie.parse(raw)[COOKIE_NAME]) ||
        (socket.handshake.auth?.token as string | undefined);
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    // Join a project room (after verifying ownership/collaborator access).
    socket.on('project:join', async (projectId: string) => {
      const project = await Project.findById(projectId).catch(() => null);
      if (!project) return;
      const isOwner = String(project.owner) === socket.data.userId;
      const isCollaborator = (project.collaborators ?? []).some(
        (c) => String(c.user) === socket.data.userId,
      );
      if (!isOwner && !isCollaborator) return;
      socket.join(room(projectId));
      socket.data.projectId = projectId;
      await emitPresence(projectId);
    });

    socket.on('project:leave', async (projectId: string) => {
      socket.leave(room(projectId));
      socket.data.projectId = undefined;
      await emitPresence(projectId);
    });

    // Live, un-persisted keystroke broadcast for collaborative editing.
    socket.on(
      'editor:change',
      (data: { projectId: string; fileId: string; content: string }) => {
        socket.to(room(data.projectId)).emit('editor:change', {
          fileId: data.fileId,
          content: data.content,
          userId: socket.data.userId,
        });
      },
    );

    // On disconnect the socket is already removed from its rooms, so recomputing
    // presence for its last project excludes it.
    socket.on('disconnect', () => {
      const projectId = socket.data.projectId;
      if (projectId) void emitPresence(projectId);
    });
  });

  return io;
}

/** Emit an event to everyone in a project room (REST-side changes). */
export function emitToProject(
  projectId: string,
  event: string,
  payload: unknown,
  _req?: unknown,
): void {
  io?.to(room(projectId)).emit(event, payload);
}
