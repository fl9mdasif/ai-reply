import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1, 'MONGODB_DB_NAME is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ENCRYPTION_KEY: z
    .string()
    .min(1, 'ENCRYPTION_KEY is required')
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'ENCRYPTION_KEY must be a base64-encoded 32 byte key',
    }),

  REGISTRATION_MODE: z.enum(['invite', 'open']).default('invite'),
  INVITE_CODE: z.string().optional(),

  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN is required'),
  META_GRAPH_VERSION: z.string().default('v21.0'),

  RAG_ENGINE_URL: z.string().url('RAG_ENGINE_URL must be a valid URL'),
  RAG_ENGINE_INTERNAL_TOKEN: z.string().min(1, 'RAG_ENGINE_INTERNAL_TOKEN is required'),
  RAG_ENGINE_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),

  CORS_ORIGINS: z.string().default(''),
  ENABLE_RETRY_JOB: booleanString.default('false'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (result.data.REGISTRATION_MODE === 'invite' && !result.data.INVITE_CODE) {
    throw new Error('Invalid environment configuration:\n  - INVITE_CODE is required when REGISTRATION_MODE=invite');
  }

  return result.data;
}

export const env = loadEnv();

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return loadEnv(source);
}

export function corsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
