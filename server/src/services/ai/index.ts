import { env } from '../../config/env.js';
import type { AiProvider, AiRequest, AiResponse, ProviderConfig } from './types.js';
import { parseAiResponse } from './parse.js';
import { createMockProvider } from './mock.js';
import { createAnthropicProvider } from './anthropic.js';
import { createOpenAiProvider } from './openai.js';
import { createGoogleProvider } from './google.js';

let envProvider: AiProvider;

/** The server-wide default provider (env-configured), used when the user has no active model. */
function getEnvProvider(): AiProvider {
  if (envProvider) return envProvider;
  switch (env.ai.provider) {
    case 'anthropic':
      envProvider = env.ai.anthropicKey ? createAnthropicProvider() : fallbackToMock('anthropic');
      break;
    case 'openai':
      envProvider = env.ai.openaiKey ? createOpenAiProvider() : fallbackToMock('openai');
      break;
    default:
      envProvider = createMockProvider();
  }
  console.log(`✓ Default AI provider: ${envProvider.name}`);
  return envProvider;
}

function fallbackToMock(intended: string): AiProvider {
  console.warn(`⚠ AI_PROVIDER=${intended} but no API key set — falling back to mock provider.`);
  return createMockProvider();
}

/** Build a provider from a user's per-request config (their key + chosen model). */
function makeProvider(config: ProviderConfig): AiProvider {
  switch (config.provider) {
    case 'anthropic':
      return createAnthropicProvider(config.apiKey, config.model);
    case 'openai':
      return createOpenAiProvider(config.apiKey, config.model);
    case 'google':
      return createGoogleProvider(config.apiKey, config.model);
  }
}

export async function runAi(req: AiRequest, config?: ProviderConfig): Promise<AiResponse> {
  const provider = config ? makeProvider(config) : getEnvProvider();
  const { raw } = await provider.complete(req);
  return parseAiResponse(raw);
}

export type { AiRequest, AiResponse, ProviderConfig } from './types.js';
