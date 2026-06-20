import type { AiProvider, AiRequest } from './types.js';
import { buildSystemPrompt, buildContextMessage } from './prompt.js';

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
      generationConfig: { maxOutputTokens },
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

      const raw = await geminiGenerate(apiKey, model, buildSystemPrompt(req), contents, 4096);
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
