import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage } from './prompt.js';

export function createAnthropicProvider(): AiProvider {
  const client = new Anthropic({ apiKey: env.ai.anthropicKey });
  return {
    name: 'anthropic',
    async complete(req: AiRequest) {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: buildContextMessage(req) },
        ...req.history.map((h) => ({ role: h.role, content: h.content }) as Anthropic.MessageParam),
        { role: 'user', content: req.message },
      ];
      const res = await client.messages.create({
        model: env.ai.anthropicModel,
        max_tokens: 4096,
        system: buildSystemPrompt(req),
        messages,
      });
      const raw = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { raw };
    },
  };
}
