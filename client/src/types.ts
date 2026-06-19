export type ProjectType = 'javascript' | 'python' | 'website';

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  _id: string;
  project: string;
  path: string;
  isFolder?: boolean;
  content: string;
  updatedAt: string;
}

export interface ChatEdit {
  path: string;
  action: 'create' | 'update' | 'delete';
}

export interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  edits?: ChatEdit[];
  createdAt: string;
}

export interface FileVersion {
  index: number;
  savedAt: string;
  content: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
}
