import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the root .env (one level up from /server) so a single file configures all.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // also allow a local server/.env to override

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/codebud'),
  jwtSecret: required('JWT_SECRET', 'super-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // Whether auth cookies require HTTPS. Defaults to NODE_ENV=production, but can
  // be overridden (e.g. COOKIE_SECURE=false when serving over plain HTTP in Docker).
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
  ai: {
    provider: (process.env.AI_PROVIDER ?? 'mock') as 'anthropic' | 'openai' | 'mock',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
    openaiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o',
  },
} as const;

export const isProd = env.nodeEnv === 'production';
