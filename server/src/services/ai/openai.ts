import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage, withBehaviour } from './prompt.js';

/**
 * OpenAI provider. apiKey/model default to the env config when omitted.
 * `baseUrl` targets an OpenAI-compatible endpoint (local LLMs, self-hosted) — used
 * for the "custom" provider. `name` lets the custom provider report its own label.
 */
export function createOpenAiProvider(
  apiKey?: string,
  model?: string,
  baseUrl?: string,
  name = 'openai',
): AiProvider {
  const client = new OpenAI({
    apiKey: apiKey || env.ai.openaiKey || 'not-needed',
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });
  const chosenModel = model || env.ai.openaiModel;
  return {
    name,
    async complete(req: AiRequest) {
      const p = req.params;
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: withBehaviour(req.systemOverride ?? buildSystemPrompt(req, req.mode), p),
        },
        { role: 'user', content: buildContextMessage(req) },
        ...req.history.map(
          (h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam,
        ),
        { role: 'user', content: req.message },
      ];
      const res = await client.chat.completions.create({
        model: chosenModel,
        messages,
        max_tokens: p?.maxTokens ?? 4096,
        ...(p?.temperature !== undefined ? { temperature: p.temperature } : {}),
        ...(p?.topP !== undefined ? { top_p: p.topP } : {}),
      });
      return { raw: res.choices[0]?.message?.content ?? '' };
    },
    async completeText({ system, user, maxTokens }) {
      const res = await client.chat.completions.create({
        model: chosenModel,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return res.choices[0]?.message?.content ?? '';
    },
  };
}
