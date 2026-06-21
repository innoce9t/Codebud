export interface AiFile {
  path: string;
  content: string;
}

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatMode = 'ask' | 'plan' | 'agent';

export type ResponseStyle = 'concise' | 'balanced' | 'detailed';

/** User-tunable generation controls applied to every request. */
export interface GenerationParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseStyle?: ResponseStyle;
  systemInstruction?: string;
}

export interface AiRequest {
  projectType: 'javascript' | 'python' | 'website';
  projectName: string;
  files: AiFile[];
  history: AiChatTurn[];
  message: string;
  mode?: ChatMode;
  /** Override the system prompt entirely (used for general/non-project chat). */
  systemOverride?: string;
  /** User-tunable generation controls (temperature, max tokens, behaviour, …). */
  params?: GenerationParams;
}

export interface AiResponse {
  /** Natural-language reply shown in the chat (edit blocks stripped out). */
  reply: string;
  /** Structured file edits the assistant requested. */
  edits: FileEdit[];
}

export interface FileEdit {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
}

export interface CompletionPrompt {
  system: string;
  user: string;
  maxTokens: number;
}

export interface AiProvider {
  name: string;
  complete(req: AiRequest): Promise<{ raw: string }>;
  /** Short, raw text completion (used for inline code completion). */
  completeText(prompt: CompletionPrompt): Promise<string>;
}

import type { Provider } from '../../models/ProviderKey.js';

/** Per-request provider override (user-supplied key + chosen model). */
export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Base URL for OpenAI-compatible custom/local endpoints. */
  baseUrl?: string;
  /** User-tunable generation controls, applied to the request. */
  params?: GenerationParams;
}
