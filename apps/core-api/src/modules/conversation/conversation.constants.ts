// CONV-4: all deterministic Bangla/English reply text lives in this one
// file, kept separate from free AI text.

export const REQUIRED_FIELDS = ['product', 'quantity', 'customerName', 'phone', 'address'] as const;
export type FieldKey = (typeof REQUIRED_FIELDS)[number];

const FIELD_LABELS: Record<FieldKey, string> = {
  product: 'product (পণ্যের নাম)',
  quantity: 'quantity (পরিমাণ)',
  customerName: 'your name (আপনার নাম)',
  phone: 'phone number (ফোন নম্বর)',
  address: 'delivery address (ডেলিভারি ঠিকানা)',
};

export const CONFIRM_KEYWORDS = ['yes', 'y', 'confirm', 'confirmed', 'ok', 'okay', 'হ্যাঁ', 'হ্যা', 'কনফার্ম'];
export const CANCEL_KEYWORDS = ['cancel', 'no', 'stop', 'না', 'বাতিল', 'ক্যানসেল'];

export const DEFAULT_FALLBACK_MESSAGE =
  'Thanks for your message! We will get back to you shortly. আপনার মেসেজ পেয়েছি, কিছুক্ষণের মধ্যে উত্তর দেব।';

export const CANCEL_REPLY =
  "No problem, I've cancelled that order. Let us know if you'd like to start again. " +
  'ঠিক আছে, অর্ডারটি বাতিল করা হয়েছে।';

export const ORDER_RECEIVED_REPLY =
  "Thank you! Your order has been received and we'll contact you soon. " +
  'ধন্যবাদ! আপনার অর্ডারটি গ্রহণ করা হয়েছে।';

export const ORDER_FAILED_REPLY =
  "Sorry, we couldn't process your order right now. Please try again or contact us directly. " +
  'দুঃখিত, এই মুহূর্তে আপনার অর্ডারটি প্রক্রিয়া করা সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';

export function buildMissingFieldsPrompt(missing: FieldKey[]): string {
  const list = missing.map((key) => FIELD_LABELS[key]).join(', ');
  return `Thanks! Could you also share: ${list}? ধন্যবাদ! অনুগ্রহ করে এই তথ্যগুলোও দিন: ${list}।`;
}

export function buildPhoneRetryPrompt(): string {
  return (
    'That phone number does not look right — please share an 11-digit Bangladeshi mobile number ' +
    '(e.g. 01XXXXXXXXX). সঠিক ফোন নম্বর দিন (যেমন 01XXXXXXXXX)।'
  );
}

export interface OrderSummaryFields {
  product?: string;
  quantity?: number;
  customerName?: string;
  phone?: string;
  address?: string;
}

// CONV-6: total isn't included — matching it against the catalog is M8's
// job during order creation, not something the conversation module knows.
export function buildOrderSummary(draft: OrderSummaryFields): string {
  return [
    'Please confirm your order:',
    `- Product: ${draft.product}`,
    `- Quantity: ${draft.quantity}`,
    `- Name: ${draft.customerName}`,
    `- Phone: ${draft.phone}`,
    `- Address: ${draft.address}`,
    '',
    'Reply YES to confirm. অর্ডার নিশ্চিত করতে YES লিখুন।',
  ].join('\n');
}

function normalizeKeyword(text: string): string {
  return text.trim().toLowerCase();
}

export function isConfirmPhrase(text: string): boolean {
  const normalized = normalizeKeyword(text);
  return CONFIRM_KEYWORDS.some((keyword) => normalized === keyword.toLowerCase());
}

export function isCancelPhrase(text: string): boolean {
  const normalized = normalizeKeyword(text);
  return CANCEL_KEYWORDS.some((keyword) => normalized === keyword.toLowerCase());
}

// CONV-5: 01[3-9] plus 8 digits, optional +880 or 880 prefix. Strips the
// prefix and returns the 0-prefixed local form, or null if it doesn't match.
export function normalizeBdPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '');
  const match = cleaned.match(/^(?:\+?880|0)?(1[3-9]\d{8})$/);
  return match ? '0' + match[1] : null;
}
