import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage } from './prompt.js';

/** Anthropic provider. apiKey/model default to the env config when omitted. */
export function createAnthropicProvider(apiKey?: string, model?: string): AiProvider {
  const client = new Anthropic({ apiKey: apiKey || env.ai.anthropicKey });
  const chosenModel = model || env.ai.anthropicModel;
  return {
    name: 'anthropic',
    async complete(req: AiRequest) {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: buildContextMessage(req) },
        ...req.history.map((h) => ({ role: h.role, content: h.content }) as Anthropic.MessageParam),
        { role: 'user', content: req.message },
      ];
      const res = await client.messages.create({
        model: chosenModel,
        max_tokens: 4096,
        system: buildSystemPrompt(req, req.mode),
        messages,
      });
      const raw = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { raw };
    },
    async completeText({ system, user, maxTokens }) {
      const res = await client.messages.create({
        model: chosenModel,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    },
  };
}
