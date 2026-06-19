import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Derive a stable 32-byte key from the JWT secret so provider API keys are
// encrypted at rest (AES-256-GCM) rather than stored in plaintext.
const key = crypto.scryptSync(env.jwtSecret, 'codebud-provider-keys', 32);

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [ivB, tagB, encB] = payload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8');
}

/** Last-4 style mask for safe display. */
export function last4(plain: string): string {
  return plain.slice(-4);
}
