import { ObjectId } from 'mongodb';
import {
  conversationsCollection,
  type ConversationDoc,
  type ConversationMessage,
  type OrderDraft,
} from '../../lib/db.js';

export interface ConversationSummary {
  _id: string;
  customerPsid: string;
  state: ConversationDoc['state'];
  messageCount: number;
  lastMessage?: { role: 'customer' | 'assistant'; text: string };
  lastActivityAt: Date;
}

export async function listConversations(
  sellerId: string,
  limit: number,
  cursor?: string,
): Promise<{ conversations: ConversationSummary[]; nextCursor?: string }> {
  const filter: Record<string, unknown> = { sellerId };
  if (cursor) {
    filter['lastActivityAt'] = { $lt: new Date(cursor) };
  }

  const docs = await conversationsCollection()
    .find(filter)
    .sort({ lastActivityAt: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  const conversations: ConversationSummary[] = page.map((doc) => ({
    _id: doc._id.toString(),
    customerPsid: doc.customerPsid,
    state: doc.state,
    messageCount: doc.messages.length,
    lastMessage: doc.messages.length > 0 ? doc.messages[doc.messages.length - 1] : undefined,
    lastActivityAt: doc.lastActivityAt,
  }));

  return {
    conversations,
    nextCursor: hasMore ? page[page.length - 1]!.lastActivityAt.toISOString() : undefined,
  };
}

export async function findConversationById(
  sellerId: string,
  id: string,
): Promise<ConversationDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return conversationsCollection().findOne({ _id: new ObjectId(id), sellerId });
}

// CONV-1: upserts by the unique (sellerId, customerPsid) index.
export async function getOrCreateConversation(
  sellerId: string,
  customerPsid: string,
): Promise<ConversationDoc> {
  const existing = await conversationsCollection().findOne({ sellerId, customerPsid });
  if (existing) return existing;

  const now = new Date();
  const fresh: ConversationDoc = {
    _id: new ObjectId(),
    sellerId,
    customerPsid,
    messages: [],
    state: 'idle',
    stateUpdatedAt: now,
    lastActivityAt: now,
  };

  try {
    await conversationsCollection().insertOne(fresh);
    return fresh;
  } catch (err) {
    // Two near-simultaneous first messages from the same customer could both
    // miss the findOne above and race on the unique index; the loser just
    // reads what the winner inserted.
    if (isDuplicateKeyError(err)) {
      const winner = await conversationsCollection().findOne({ sellerId, customerPsid });
      if (winner) return winner;
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}

export async function saveConversationTurn(
  conversationId: ObjectId,
  messages: ConversationMessage[],
  state: ConversationDoc['state'],
  orderDraft: OrderDraft | undefined,
): Promise<void> {
  const now = new Date();
  const setFields: Partial<ConversationDoc> = { messages, state, stateUpdatedAt: now, lastActivityAt: now };
  if (orderDraft !== undefined) setFields.orderDraft = orderDraft;

  await conversationsCollection().updateOne(
    { _id: conversationId },
    {
      $set: setFields,
      // Clearing the draft removes the field entirely rather than setting it
      // to null, matching the optional type (orderDraft?: OrderDraft).
      ...(orderDraft === undefined ? { $unset: { orderDraft: '' } } : {}),
    },
  );
}
