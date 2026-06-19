import type { Provider } from '../../models/ProviderKey.js';

export interface CatalogModel {
  id: string; // the model id passed to the provider API
  name: string; // display name
  description: string;
}

export interface CatalogProvider {
  id: Provider;
  name: string; // company
  vendor: string; // product family
  getKeyUrl: string;
  getKeyLabel: string;
  models: CatalogModel[];
}

export const MODEL_CATALOG: CatalogProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    vendor: 'Claude',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    getKeyLabel: 'Anthropic Console',
    models: [
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude 4.6 Sonnet',
        description:
          'The industry gold standard for inline generation, deep logic understanding, and repository-wide debugging.',
      },
      {
        id: 'claude-opus-4-8',
        name: 'Claude 4.8 Opus',
        description:
          'The highest-tier model optimized for complex, multi-step software engineering and autonomous agent tasks.',
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude 4.5 Haiku',
        description:
          'Ultra-fast, low-latency model designed for rapid, real-time code completion and quick syntax checking.',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    vendor: 'GPT',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeyLabel: 'OpenAI Platform',
    models: [
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        description: 'OpenAI flagship model for general-purpose coding, reasoning and tool use.',
      },
      {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 mini',
        description: 'Smaller, faster GPT-5.4 tuned for quick, cost-efficient completions.',
      },
      {
        id: 'gpt-5.4-pro',
        name: 'GPT-5.4-pro',
        description: 'Highest-capability GPT-5.4 tier for the most demanding engineering tasks.',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    vendor: 'Gemini',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyLabel: 'Google AI Studio',
    models: [
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        description: 'Fast multimodal model balanced for everyday coding and chat.',
      },
      {
        id: 'gemini-flash-latest',
        name: 'gemini-flash-latest',
        description: 'Always points to the latest stable Gemini Flash release.',
      },
      {
        id: 'gemini-flash-lite-latest',
        name: 'gemini-flash-lite-latest',
        description: 'Lightweight, low-latency Gemini Flash for rapid completions.',
      },
    ],
  },
];

/** Resolve a model id back to its provider + model entry. */
export function findModel(modelId: string): { provider: Provider; model: CatalogModel } | null {
  for (const p of MODEL_CATALOG) {
    const model = p.models.find((m) => m.id === modelId);
    if (model) return { provider: p.id, model };
  }
  return null;
}
