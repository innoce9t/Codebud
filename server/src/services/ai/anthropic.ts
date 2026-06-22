import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage, withBehaviour } from './prompt.js';

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
      const p = req.params;
      // Anthropic accepts temperature 0–1 (the app allows up to 2) and caps output
      // tokens per model — clamp both so out-of-range settings don't 400.
      const res = await client.messages.create({
        model: chosenModel,
        max_tokens: Math.min(p?.maxTokens ?? 4096, 8192),
        ...(p?.temperature !== undefined ? { temperature: Math.min(Math.max(p.temperature, 0), 1) } : {}),
        ...(p?.topP !== undefined ? { top_p: p.topP } : {}),
        system: withBehaviour(req.systemOverride ?? buildSystemPrompt(req, req.mode), p),
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
        max_tokens: Math.min(maxTokens, 8192),
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
