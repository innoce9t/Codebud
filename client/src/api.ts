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
};

export const aiApi = {
  catalog: () => http.get<AiCatalog>('/ai/catalog').then((r) => r.data),
  connect: (provider: AiProvider, apiKey: string) =>
    http.put(`/ai/providers/${provider}`, { apiKey }).then(() => undefined),
  disconnect: (provider: AiProvider) =>
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

export const chatApi = {
  history: (projectId: string) =>
    http.get<{ messages: ChatMessage[] }>(`/projects/${projectId}/chat`).then((r) => r.data.messages),
  send: (projectId: string, message: string) =>
    http
      .post<{ userMessage: ChatMessage; assistantMessage: ChatMessage; edits: unknown[] }>(
        `/projects/${projectId}/chat`,
        { message },
      )
      .then((r) => r.data),
  clear: (projectId: string) => http.delete(`/projects/${projectId}/chat`).then(() => undefined),
};
