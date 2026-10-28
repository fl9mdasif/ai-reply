// Typed internal client to jobabai-rag-engine (PRD section 11.1). This is
// the only code that calls the Python service directly. Every request sends
// X-Internal-Token; every body includes sellerId. Responses are validated
// with Zod so a contract drift fails loudly here instead of corrupting state.
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { UpstreamError } from './errors.js';

interface RagEngineRequest {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
  timeoutMs: number;
}

async function ragEngineRequest({ method, path, body, timeoutMs }: RagEngineRequest): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(path, env.RAG_ENGINE_URL), {
      method,
      headers: {
        'X-Internal-Token': env.RAG_ENGINE_INTERNAL_TOKEN,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`rag-engine ${method} ${path} responded ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

export interface FaqEntryInput {
  question: string;
  answer: string;
}

export interface EmbedInput {
  sellerId: string;
  productId: string;
  name: string;
  description?: string;
  faqEntries?: FaqEntryInput[];
}

const embedResponseSchema = z.object({ chunksEmbedded: z.number() });

// CAT-3: 8s timeout, one retry. Throws UpstreamError on failure — the
// caller (catalog.service.ts) is responsible for marking embedStatus: failed.
export async function embed(input: EmbedInput): Promise<{ chunksEmbedded: number }> {
  try {
    const body = await withOneRetry(() =>
      ragEngineRequest({ method: 'POST', path: '/embed', body: input, timeoutMs: 8000 }),
    );
    return embedResponseSchema.parse(body);
  } catch (err) {
    logger.error({ err, sellerId: input.sellerId, productId: input.productId }, 'rag-engine embed failed');
    throw new UpstreamError('Failed to embed product');
  }
}

// CAT-5: 8s timeout, one retry. Throws UpstreamError — catalog.service.ts
// logs and continues rather than failing the delete.
export async function removeEmbedding(sellerId: string, productId: string): Promise<void> {
  try {
    await withOneRetry(() =>
      ragEngineRequest({
        method: 'DELETE',
        path: `/embed/${encodeURIComponent(productId)}?sellerId=${encodeURIComponent(sellerId)}`,
        timeoutMs: 8000,
      }),
    );
  } catch (err) {
    logger.error({ err, sellerId, productId }, 'rag-engine removeEmbedding failed');
    throw new UpstreamError('Failed to remove embedding');
  }
}

export interface HistoryTurn {
  role: 'customer' | 'assistant';
  text: string;
}

export interface RespondInput {
  sellerId: string;
  customerPsid: string;
  message: string;
  history: HistoryTurn[];
}

export interface RespondResult {
  reply: string;
  orderIntentDetected: boolean;
  extractedFields?: Record<string, unknown>;
}

const respondResponseSchema = z.object({
  reply: z.string(),
  orderIntentDetected: z.boolean(),
  extractedFields: z.record(z.unknown()).optional(),
});

// CONV-2: 8s timeout, one retry with a short backoff. Unlike embed/
// removeEmbedding, this never throws — it returns null on any failure so
// the webhook's fallback message path (WH-6) always has something to send.
export async function respond(input: RespondInput): Promise<RespondResult | null> {
  const attempt = () =>
    ragEngineRequest({ method: 'POST', path: '/respond', body: input, timeoutMs: 8000 });

  try {
    let body: unknown;
    try {
      body = await attempt();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
      body = await attempt();
    }
    return respondResponseSchema.parse(body);
  } catch (err) {
    logger.error({ err, sellerId: input.sellerId }, 'rag-engine respond failed');
    return null;
  }
}

export interface RiskScoreInput {
  sellerId: string;
  product: string;
  quantity: number;
  customerName: string;
  phone: string;
  address: string;
}

export interface RiskFlag {
  code: string;
  reason: string;
}

export interface RiskScoreResult {
  riskFlags: RiskFlag[];
  riskScore: number | null;
}

const riskScoreResponseSchema = z.object({
  riskFlags: z.array(z.object({ code: z.string(), reason: z.string() })),
  riskScore: z.number().nullable(),
  explanations: z.array(z.string()).optional(),
});

// ORD-1, ORD-2: 4s timeout, no retry (PRD 11.1). Fail-soft — never throws;
// a failure becomes the risk_unavailable flag with a null score so a risk
// check that can't run never blocks or loses an order.
export async function riskScore(input: RiskScoreInput): Promise<RiskScoreResult> {
  try {
    const body = await ragEngineRequest({ method: 'POST', path: '/risk-score', body: input, timeoutMs: 4000 });
    const parsed = riskScoreResponseSchema.parse(body);
    return { riskFlags: parsed.riskFlags, riskScore: parsed.riskScore };
  } catch (err) {
    logger.error({ err, sellerId: input.sellerId }, 'rag-engine risk-score failed');
    return {
      riskFlags: [{ code: 'risk_unavailable', reason: 'Risk check could not run' }],
      riskScore: null,
    };
  }
}
