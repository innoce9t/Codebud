import { env } from '../../config/env.js';
import type { AiProvider, AiRequest, AiResponse } from './types.js';
import { parseAiResponse } from './parse.js';
import { createMockProvider } from './mock.js';
import { createAnthropicProvider } from './anthropic.js';
import { createOpenAiProvider } from './openai.js';

let provider: AiProvider;

function getProvider(): AiProvider {
  if (provider) return provider;
  switch (env.ai.provider) {
    case 'anthropic':
      provider = env.ai.anthropicKey ? createAnthropicProvider() : fallbackToMock('anthropic');
      break;
    case 'openai':
      provider = env.ai.openaiKey ? createOpenAiProvider() : fallbackToMock('openai');
      break;
    default:
      provider = createMockProvider();
  }
  console.log(`✓ AI provider: ${provider.name}`);
  return provider;
}

function fallbackToMock(intended: string): AiProvider {
  console.warn(`⚠ AI_PROVIDER=${intended} but no API key set — falling back to mock provider.`);
  return createMockProvider();
}

export async function runAi(req: AiRequest): Promise<AiResponse> {
  const { raw } = await getProvider().complete(req);
  return parseAiResponse(raw);
}

export type { AiRequest, AiResponse } from './types.js';
