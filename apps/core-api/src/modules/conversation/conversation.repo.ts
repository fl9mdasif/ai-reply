import { ObjectId } from 'mongodb';
import {
  conversationsCollection,
  type ConversationDoc,
  type ConversationMessage,
  type OrderDraft,
} from '../../lib/db.js';

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
