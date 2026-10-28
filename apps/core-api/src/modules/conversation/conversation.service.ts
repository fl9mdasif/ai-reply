import type { ConversationDoc, ConversationMessage, OrderDraft } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { respond, type HistoryTurn } from '../../lib/rag-engine-client.js';
import { createFromDraft } from '../order/order.service.js';
import {
  CANCEL_REPLY,
  DEFAULT_FALLBACK_MESSAGE,
  ORDER_FAILED_REPLY,
  ORDER_RECEIVED_REPLY,
  REQUIRED_FIELDS,
  buildMissingFieldsPrompt,
  buildOrderSummary,
  buildPhoneRetryPrompt,
  isCancelPhrase,
  isConfirmPhrase,
  normalizeBdPhone,
  type FieldKey,
} from './conversation.constants.js';
import { getOrCreateConversation, saveConversationTurn } from './conversation.repo.js';

const MAX_WINDOW = 12;
const STALE_DRAFT_MS = 30 * 60 * 1000;

export interface HandleMessageResult {
  reply: string;
  usedFallback: boolean;
}

function appendWindow(
  existing: ConversationMessage[],
  customerMessage: ConversationMessage,
  assistantMessage: ConversationMessage,
): ConversationMessage[] {
  return [...existing, customerMessage, assistantMessage].slice(-MAX_WINDOW);
}

function isStale(stateUpdatedAt: Date): boolean {
  return Date.now() - stateUpdatedAt.getTime() > STALE_DRAFT_MS;
}

function missingFields(draft: OrderDraft | undefined): FieldKey[] {
  return REQUIRED_FIELDS.filter((key) => {
    const value = draft?.[key];
    return value === undefined || value === null || value === '';
  });
}

// CONV-3, CONV-5: merges non-null extracted values into the draft, never
// overwriting an already-filled field with an empty one. Phone is special:
// an invalid value is withheld from the draft until the second bad
// attempt, so it keeps showing up as "missing" and gets re-asked exactly
// once before risk scoring is left to flag it (phoneAttempts, M8).
function mergeExtractedFields(
  existing: OrderDraft | undefined,
  extracted: Record<string, unknown> | undefined,
): OrderDraft {
  const merged: OrderDraft = { ...existing };
  if (!extracted) return merged;

  for (const key of REQUIRED_FIELDS) {
    if (key === 'phone' || key === 'quantity') continue;
    const value = extracted[key];
    if (typeof value === 'string' && value.trim() !== '') {
      merged[key] = value.trim();
    }
  }

  const rawQuantity = extracted.quantity;
  if (rawQuantity !== undefined && rawQuantity !== null) {
    const num = Number(rawQuantity);
    if (Number.isFinite(num) && num > 0) merged.quantity = num;
  }

  const rawPhone = extracted.phone;
  if (typeof rawPhone === 'string' && rawPhone.trim() !== '') {
    const normalized = normalizeBdPhone(rawPhone);
    if (normalized) {
      merged.phone = normalized;
    } else {
      const attempts = (existing?.phoneAttempts ?? 0) + 1;
      merged.phoneAttempts = attempts;
      if (attempts >= 2) {
        // CONV-5: accept the bad value on the second attempt; risk scoring
        // (M8) is told via phoneAttempts and flags the order instead.
        merged.phone = rawPhone.trim();
      }
    }
  }

  return merged;
}

export async function handleCustomerMessage(
  sellerId: string,
  customerPsid: string,
  text: string,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  const conversation = await getOrCreateConversation(sellerId, customerPsid);

  // CONV-8: a draft untouched for 30 minutes is discarded before this
  // message is processed, dropping straight back to idle.
  const stale = conversation.state !== 'idle' && isStale(conversation.stateUpdatedAt);
  const state = stale ? 'idle' : conversation.state;
  const draft = stale ? undefined : conversation.orderDraft;

  const customerMessage: ConversationMessage = { role: 'customer', text, ts: new Date() };
  const history: HistoryTurn[] = conversation.messages.map((m) => ({ role: m.role, text: m.text }));

  // CONV-9: a cancel phrase clears the draft at any point in the order flow.
  if (state !== 'idle' && isCancelPhrase(text)) {
    const assistantMessage: ConversationMessage = { role: 'assistant', text: CANCEL_REPLY, ts: new Date() };
    await saveConversationTurn(
      conversation._id,
      appendWindow(conversation.messages, customerMessage, assistantMessage),
      'idle',
      undefined,
    );
    return { reply: CANCEL_REPLY, usedFallback: false };
  }

  if (state === 'idle') {
    return handleIdleState(conversation, customerMessage, history, text, fallbackMessage);
  }

  if (state === 'awaiting_confirmation') {
    return handleAwaitingConfirmation(conversation, customerMessage, history, text, draft, fallbackMessage);
  }

  return handleCollectingOrder(conversation, customerMessage, history, text, draft, fallbackMessage);
}

// CONV-1, CONV-2, CONV-10, CONV-11
async function handleIdleState(
  conversation: ConversationDoc,
  customerMessage: ConversationMessage,
  history: HistoryTurn[],
  text: string,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  const result = await respond({
    sellerId: conversation.sellerId,
    customerPsid: conversation.customerPsid,
    message: text,
    history,
  });

  if (!result) {
    return useFallback(conversation, customerMessage, 'idle', undefined, fallbackMessage);
  }

  if (result.orderIntentDetected) {
    const draft = mergeExtractedFields(undefined, result.extractedFields);
    return afterFieldMerge(conversation, customerMessage, draft);
  }

  // Staying idle never carries a draft — whether this conversation was
  // already idle or was just reset here for being stale (CONV-8).
  const assistantMessage: ConversationMessage = { role: 'assistant', text: result.reply, ts: new Date() };
  await saveConversationTurn(
    conversation._id,
    appendWindow(conversation.messages, customerMessage, assistantMessage),
    'idle',
    undefined,
  );
  return { reply: result.reply, usedFallback: false };
}

// CONV-3
async function handleCollectingOrder(
  conversation: ConversationDoc,
  customerMessage: ConversationMessage,
  history: HistoryTurn[],
  text: string,
  draft: OrderDraft | undefined,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  const result = await respond({
    sellerId: conversation.sellerId,
    customerPsid: conversation.customerPsid,
    message: text,
    history,
  });

  if (!result) {
    return useFallback(conversation, customerMessage, 'collecting_order', draft, fallbackMessage);
  }

  return afterFieldMerge(conversation, customerMessage, mergeExtractedFields(draft, result.extractedFields));
}

// CONV-4, CONV-5, CONV-6: the deterministic reply once fields have been
// merged — a phone re-ask, a missing-fields prompt, or the
// awaiting_confirmation summary. Never free AI text.
async function afterFieldMerge(
  conversation: ConversationDoc,
  customerMessage: ConversationMessage,
  draft: OrderDraft,
): Promise<HandleMessageResult> {
  const missing = missingFields(draft);

  if (missing.includes('phone') && (draft.phoneAttempts ?? 0) === 1) {
    const reply = buildPhoneRetryPrompt();
    const assistantMessage: ConversationMessage = { role: 'assistant', text: reply, ts: new Date() };
    await saveConversationTurn(
      conversation._id,
      appendWindow(conversation.messages, customerMessage, assistantMessage),
      'collecting_order',
      draft,
    );
    return { reply, usedFallback: false };
  }

  if (missing.length > 0) {
    const reply = buildMissingFieldsPrompt(missing);
    const assistantMessage: ConversationMessage = { role: 'assistant', text: reply, ts: new Date() };
    await saveConversationTurn(
      conversation._id,
      appendWindow(conversation.messages, customerMessage, assistantMessage),
      'collecting_order',
      draft,
    );
    return { reply, usedFallback: false };
  }

  const reply = buildOrderSummary(draft);
  const assistantMessage: ConversationMessage = { role: 'assistant', text: reply, ts: new Date() };
  await saveConversationTurn(
    conversation._id,
    appendWindow(conversation.messages, customerMessage, assistantMessage),
    'awaiting_confirmation',
    draft,
  );
  return { reply, usedFallback: false };
}

// CONV-7
async function handleAwaitingConfirmation(
  conversation: ConversationDoc,
  customerMessage: ConversationMessage,
  history: HistoryTurn[],
  text: string,
  draft: OrderDraft | undefined,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  if (isConfirmPhrase(text)) {
    let reply = ORDER_RECEIVED_REPLY;
    try {
      await createFromDraft({
        sellerId: conversation.sellerId,
        conversationId: conversation._id,
        customerPsid: conversation.customerPsid,
        draft: draft ?? {},
      });
    } catch (err) {
      logger.error({ err, sellerId: conversation.sellerId }, 'order creation failed on confirm');
      reply = ORDER_FAILED_REPLY;
    }
    const assistantMessage: ConversationMessage = { role: 'assistant', text: reply, ts: new Date() };
    await saveConversationTurn(
      conversation._id,
      appendWindow(conversation.messages, customerMessage, assistantMessage),
      'idle',
      undefined,
    );
    return { reply, usedFallback: false };
  }

  // Anything else is a correction: re-extract and re-summarize.
  const result = await respond({
    sellerId: conversation.sellerId,
    customerPsid: conversation.customerPsid,
    message: text,
    history,
  });

  if (!result) {
    return useFallback(conversation, customerMessage, 'awaiting_confirmation', draft, fallbackMessage);
  }

  return afterFieldMerge(conversation, customerMessage, mergeExtractedFields(draft, result.extractedFields));
}

async function useFallback(
  conversation: ConversationDoc,
  customerMessage: ConversationMessage,
  state: ConversationDoc['state'],
  draft: OrderDraft | undefined,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  const fallbackText = fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE;
  const assistantMessage: ConversationMessage = { role: 'assistant', text: fallbackText, ts: new Date() };
  await saveConversationTurn(
    conversation._id,
    appendWindow(conversation.messages, customerMessage, assistantMessage),
    state,
    draft,
  );
  return { reply: fallbackText, usedFallback: true };
}
