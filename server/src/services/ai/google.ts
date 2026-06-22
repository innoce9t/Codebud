import type { AiProvider, AiRequest, GenerationParams } from './types.js';
import { buildSystemPrompt, buildContextMessage, withBehaviour } from './prompt.js';

/**
 * Google Gemini provider via the Generative Language REST API (no SDK needed).
 * https://ai.google.dev/api/generate-content
 */
async function geminiGenerate(
  apiKey: string,
  model: string,
  system: string,
  contents: unknown,
  maxOutputTokens: number,
  params?: GenerationParams,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        // Cap output tokens so a high setting can't exceed a model's limit.
        maxOutputTokens: Math.min(maxOutputTokens, 8192),
        ...(params?.temperature !== undefined ? { temperature: Math.min(Math.max(params.temperature, 0), 2) } : {}),
        ...(params?.topP !== undefined ? { topP: params.topP } : {}),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

export function createGoogleProvider(apiKey: string, model: string): AiProvider {
  return {
    name: 'google',
    async complete(req: AiRequest) {
      const contents = [
        { role: 'user', parts: [{ text: buildContextMessage(req) }] },
        ...req.history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: req.message }] },
      ];

      const p = req.params;
      const raw = await geminiGenerate(
        apiKey,
        model,
        withBehaviour(req.systemOverride ?? buildSystemPrompt(req, req.mode), p),
        contents,
        p?.maxTokens ?? 4096,
        p,
      );
      return { raw };
    },
    async completeText({ system, user, maxTokens }) {
      return geminiGenerate(
        apiKey,
        model,
        system,
        [{ role: 'user', parts: [{ text: user }] }],
        maxTokens,
      );
    },
  };
}
