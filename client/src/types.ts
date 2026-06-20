export type ProjectType = 'javascript' | 'python' | 'website';

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: { mode: 'light' | 'dark' | 'system'; accent: string };
  editor: { fontSize: number; tabSize: number; wordWrap: boolean; minimap: boolean };
  notifications: { productUpdates: boolean; projectActivity: boolean };
}

export type SubscriptionTier = 'free' | 'pro' | 'team';

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  subscriptionTier?: SubscriptionTier;
  preferences?: UserPreferences;
  billing?: { cardBrand: string; cardLast4: string };
}

export interface ProfilePatch {
  name?: string;
  subscriptionTier?: SubscriptionTier;
  billing?: { cardBrand: string; cardLast4: string };
  preferences?: {
    language?: string;
    timezone?: string;
    theme?: Partial<UserPreferences['theme']>;
    editor?: Partial<UserPreferences['editor']>;
    notifications?: Partial<UserPreferences['notifications']>;
  };
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  type: ProjectType;
  owner: string;
  collaborators?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  _id: string;
  name: string;
  email: string;
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

export type AiProvider = 'anthropic' | 'openai' | 'google';

export interface CatalogModel {
  id: string;
  name: string;
  description: string;
}

export interface CatalogProvider {
  id: AiProvider;
  name: string;
  vendor: string;
  getKeyUrl: string;
  getKeyLabel: string;
  models: CatalogModel[];
  connected: boolean;
  last4: string | null;
}

export interface AiCatalog {
  providers: CatalogProvider[];
  activeModel: string | null;
}
