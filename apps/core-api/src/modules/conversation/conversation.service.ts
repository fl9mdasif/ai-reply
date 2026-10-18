import type { ConversationMessage, OrderDraft } from '../../lib/db.js';
import { respond } from '../../lib/rag-engine-client.js';
import { getOrCreateConversation, saveConversationTurn } from './conversation.repo.js';

const MAX_WINDOW = 12;
const DEFAULT_FALLBACK_MESSAGE =
  'Thanks for your message! We will get back to you shortly. আপনার মেসেজ পেয়েছি, কিছুক্ষণের মধ্যে উত্তর দেব।';

export interface HandleMessageResult {
  reply: string;
  usedFallback: boolean;
}

// CONV-1, CONV-2, CONV-10, CONV-11. Only the 'idle' branch is handled here —
// moving through collecting_order/awaiting_confirmation (CONV-3..9) is M6
// scope; a conversation already past idle just keeps getting AI replies
// without re-detecting intent until M6 adds that state machine.
export async function handleCustomerMessage(
  sellerId: string,
  customerPsid: string,
  text: string,
  fallbackMessage?: string,
): Promise<HandleMessageResult> {
  const conversation = await getOrCreateConversation(sellerId, customerPsid);

  // CONV-11: the stored window only, never more, goes out as history. The
  // current message is sent separately as `message`, so it's excluded here.
  const history = conversation.messages.map((m) => ({ role: m.role, text: m.text }));

  const result = await respond({ sellerId, customerPsid, message: text, history });

  const now = new Date();
  const customerMessage: ConversationMessage = { role: 'customer', text, ts: now };

  if (!result) {
    // WH-6: rag-engine failed — use the seller's fallback message (or the
    // default) so the customer is never left without a reply. The turn is
    // still recorded so the window stays accurate for next time.
    const fallbackText = fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE;
    const assistantMessage: ConversationMessage = { role: 'assistant', text: fallbackText, ts: new Date() };
    const nextMessages = [...conversation.messages, customerMessage, assistantMessage].slice(-MAX_WINDOW);

    await saveConversationTurn(conversation._id, nextMessages, conversation.state, conversation.orderDraft);
    return { reply: fallbackText, usedFallback: true };
  }

  let nextState = conversation.state;
  let nextDraft: OrderDraft | undefined = conversation.orderDraft;

  // CONV-2
  if (conversation.state === 'idle' && result.orderIntentDetected) {
    nextState = 'collecting_order';
    nextDraft = { ...conversation.orderDraft, ...(result.extractedFields as OrderDraft | undefined) };
  }

  // CONV-10
  const assistantMessage: ConversationMessage = { role: 'assistant', text: result.reply, ts: new Date() };
  const nextMessages = [...conversation.messages, customerMessage, assistantMessage].slice(-MAX_WINDOW);

  await saveConversationTurn(conversation._id, nextMessages, nextState, nextDraft);

  return { reply: result.reply, usedFallback: false };
}
