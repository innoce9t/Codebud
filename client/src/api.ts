import axios from 'axios';
import type {
  Project,
  ProjectType,
  FileNode,
  ChatMessage,
  User,
  FileVersion,
  TemplateMeta,
  AiProvider,
  AiCatalog,
  ProfilePatch,
  Collaborator,
} from './types';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Surface a clean error message to the UI.
http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  },
);

export interface HealthInfo {
  ok: boolean;
  aiProvider: 'anthropic' | 'openai' | 'mock';
  time: string;
}

export const systemApi = {
  health: () => http.get<HealthInfo>('/health').then((r) => r.data),
};

export const authApi = {
  signup: (data: { name?: string; email: string; password: string }) =>
    http.post<{ user: User }>('/auth/signup', data).then((r) => r.data.user),
  login: (data: { email: string; password: string }) =>
    http.post<{ user: User }>('/auth/login', data).then((r) => r.data.user),
  logout: () => http.post('/auth/logout').then(() => undefined),
  me: () => http.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  updateMe: (patch: ProfilePatch) =>
    http.patch<{ user: User }>('/auth/me', patch).then((r) => r.data.user),
  deleteMe: () => http.delete('/auth/me').then(() => undefined),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post('/auth/change-password', { currentPassword, newPassword }).then(() => undefined),
  forgotPassword: (email: string) =>
    http
      .post<{ ok: boolean; demoToken?: string; expiresInMinutes?: number }>('/auth/forgot-password', { email })
      .then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    http.post<{ user: User }>('/auth/reset-password', { token, password }).then((r) => r.data.user),
  exportData: () => http.get('/auth/export').then((r) => r.data),
};

export const aiApi = {
  catalog: () => http.get<AiCatalog>('/ai/catalog').then((r) => r.data),
  connect: (provider: AiProvider | 'custom', apiKey: string) =>
    http.put(`/ai/providers/${provider}`, { apiKey }).then(() => undefined),
  disconnect: (provider: AiProvider | 'custom') =>
    http.delete(`/ai/providers/${provider}`).then(() => undefined),
  setActive: (model: string) => http.put('/ai/active', { model }).then(() => undefined),
};

export const templateApi = {
  list: () =>
    http
      .get<{ templates: Record<ProjectType, TemplateMeta[]> }>('/templates')
      .then((r) => r.data.templates),
};

export const projectApi = {
  list: (type?: ProjectType) =>
    http.get<{ projects: Project[] }>('/projects', { params: { type } }).then((r) => r.data.projects),
  create: (data: { name: string; description?: string; type: ProjectType; template?: string }) =>
    http.post<{ project: Project }>('/projects', data).then((r) => r.data.project),
  get: (id: string) =>
    http.get<{ project: Project; files: FileNode[] }>(`/projects/${id}`).then((r) => r.data),
  update: (id: string, patch: { name?: string; description?: string }) =>
    http.patch<{ project: Project }>(`/projects/${id}`, patch).then((r) => r.data.project),
  remove: (id: string) => http.delete(`/projects/${id}`).then(() => undefined),
};

export const fileApi = {
  list: (projectId: string) =>
    http.get<{ files: FileNode[] }>(`/projects/${projectId}/files`).then((r) => r.data.files),
  create: (projectId: string, data: { path: string; content?: string; isFolder?: boolean }) =>
    http.post<{ file: FileNode }>(`/projects/${projectId}/files`, data).then((r) => r.data.file),
  save: (projectId: string, fileId: string, content: string) =>
    http.put<{ file: FileNode }>(`/projects/${projectId}/files/${fileId}`, { content }).then((r) => r.data.file),
  rename: (projectId: string, fileId: string, path: string) =>
    http.patch<{ file: FileNode }>(`/projects/${projectId}/files/${fileId}`, { path }).then((r) => r.data.file),
  remove: (projectId: string, fileId: string) =>
    http.delete(`/projects/${projectId}/files/${fileId}`).then(() => undefined),
  versions: (projectId: string, fileId: string) =>
    http
      .get<{ current: string; versions: FileVersion[] }>(`/projects/${projectId}/files/${fileId}/versions`)
      .then((r) => r.data),
  restore: (projectId: string, fileId: string, index: number) =>
    http
      .post<{ file: FileNode }>(`/projects/${projectId}/files/${fileId}/restore`, { index })
      .then((r) => r.data.file),
};

export interface ShareState {
  owner: Collaborator;
  collaborators: Collaborator[];
  isOwner: boolean;
  linkSharing: boolean;
  shareToken?: string;
}

export const collaboratorApi = {
  list: (projectId: string) =>
    http.get<ShareState>(`/projects/${projectId}/collaborators`).then((r) => r.data),
  add: (projectId: string, email: string) =>
    http
      .post<{ collaborators: Collaborator[] }>(`/projects/${projectId}/collaborators`, { email })
      .then((r) => r.data.collaborators),
  remove: (projectId: string, userId: string) =>
    http
      .delete<{ collaborators: Collaborator[] }>(`/projects/${projectId}/collaborators/${userId}`)
      .then((r) => r.data.collaborators),
  setLinkSharing: (projectId: string, linkSharing: boolean) =>
    http
      .put<{ linkSharing: boolean; shareToken: string; collaborators: Collaborator[] }>(
        `/projects/${projectId}/share`,
        { linkSharing },
      )
      .then((r) => r.data),
  regenerate: (projectId: string) =>
    http
      .post<{ shareToken: string }>(`/projects/${projectId}/share/regenerate`, {})
      .then((r) => r.data.shareToken),
  join: (projectId: string, token: string) =>
    http.post(`/projects/${projectId}/join`, { token }).then(() => undefined),
};

export const completionApi = {
  complete: (
    projectId: string,
    data: { language?: string; prefix: string; suffix?: string },
    signal?: AbortSignal,
  ) =>
    http
      .post<{ completion: string }>(`/projects/${projectId}/complete`, data, { signal })
      .then((r) => r.data.completion),
};

export interface SessionMeta {
  _id: string;
  title: string;
  project?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const sessionApi = {
  list: (projectId?: string) =>
    http
      .get<{ sessions: SessionMeta[] }>('/sessions', { params: projectId ? { projectId } : {} })
      .then((r) => r.data.sessions),
  general: () => http.get<{ session: SessionMeta }>('/sessions/general').then((r) => r.data.session),
  create: (data?: { title?: string; projectId?: string }) =>
    http.post<{ session: SessionMeta }>('/sessions', data ?? {}).then((r) => r.data.session),
  rename: (id: string, title: string) =>
    http.patch<{ session: SessionMeta }>(`/sessions/${id}/title`, { title }).then((r) => r.data.session),
  remove: (id: string) => http.delete(`/sessions/${id}`).then(() => undefined),
  clearMessages: (id: string) => http.delete(`/sessions/${id}/messages`).then(() => undefined),
  messages: (id: string) =>
    http
      .get<{ messages: ChatMessage[]; session: SessionMeta }>(`/sessions/${id}/messages`)
      .then((r) => r.data),
  send: (
    sessionId: string,
    message: string,
    mode: 'ask' | 'plan' | 'agent' = 'ask',
    approvalMode: 'auto' | 'review' = 'auto',
  ) =>
    http
      .post<{ userMessage: ChatMessage; assistantMessage: ChatMessage; edits: unknown[]; pendingEdits: unknown[]; session: SessionMeta }>(
        `/sessions/${sessionId}/messages`,
        { message, mode, approvalMode },
      )
      .then((r) => r.data),
  applyEdits: (sessionId: string, msgId: string) =>
    http
      .post<{ ok: boolean; applied: unknown[]; message: ChatMessage }>(`/sessions/${sessionId}/messages/${msgId}/apply`, {})
      .then((r) => r.data),
  rejectEdits: (sessionId: string, msgId: string) =>
    http
      .delete<{ ok: boolean; message: ChatMessage }>(`/sessions/${sessionId}/messages/${msgId}/pending`)
      .then((r) => r.data),
};

export const chatApi = {
  history: (projectId: string) =>
    http.get<{ messages: ChatMessage[] }>(`/projects/${projectId}/chat`).then((r) => r.data.messages),
  send: (projectId: string, message: string, mode: 'ask' | 'plan' | 'agent' = 'ask') =>
    http
      .post<{ userMessage: ChatMessage; assistantMessage: ChatMessage; edits: unknown[] }>(
        `/projects/${projectId}/chat`,
        { message, mode },
      )
      .then((r) => r.data),
  clear: (projectId: string) => http.delete(`/projects/${projectId}/chat`).then(() => undefined),
};
