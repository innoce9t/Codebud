import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage } from './prompt.js';

export function createOpenAiProvider(): AiProvider {
  const client = new OpenAI({ apiKey: env.ai.openaiKey });
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
        model: env.ai.openaiModel,
        messages,
        max_tokens: 4096,
      });
      return { raw: res.choices[0]?.message?.content ?? '' };
    },
  };
}
