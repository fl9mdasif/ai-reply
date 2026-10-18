import type { Request, Response } from 'express';
import { pingDb } from '../../lib/db.js';
import { env } from '../../config/env.js';

// HLT-1: GET /health returns 200 with no dependencies touched.
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: 'ok' });
}

async function checkRagEngine(): Promise<'ok' | 'down'> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(new URL('/health', env.RAG_ENGINE_URL), {
      headers: { 'X-Internal-Token': env.RAG_ENGINE_INTERNAL_TOKEN },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

// HLT-2: GET /health/deps reports Mongo and rag-engine status.
// Mongo down -> 503. rag-engine down is reported but does not fail the whole check.
export async function getHealthDeps(_req: Request, res: Response): Promise<void> {
  const [mongoOk, ragEngineStatus] = await Promise.all([pingDb(), checkRagEngine()]);

  const body = {
    status: mongoOk ? 'ok' : 'down',
    mongo: mongoOk ? 'ok' : 'down',
    ragEngine: ragEngineStatus,
  };

  res.status(mongoOk ? 200 : 503).json(body);
}
