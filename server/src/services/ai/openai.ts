import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage } from './prompt.js';

/** OpenAI provider. apiKey/model default to the env config when omitted. */
export function createOpenAiProvider(apiKey?: string, model?: string): AiProvider {
  const client = new OpenAI({ apiKey: apiKey || env.ai.openaiKey });
  const chosenModel = model || env.ai.openaiModel;
  return {
    name: 'openai',
    async complete(req: AiRequest) {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: buildSystemPrompt(req) },
        { role: 'user', content: buildContextMessage(req) },
        ...req.history.map(
          (h) => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam,
        ),
        { role: 'user', content: req.message },
      ];
      const res = await client.chat.completions.create({
        model: chosenModel,
        messages,
        max_tokens: 4096,
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
