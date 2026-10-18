import { ObjectId } from 'mongodb';
import { webhookEventsCollection } from '../../lib/db.js';

const DUPLICATE_KEY_ERROR_CODE = 11000;

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === DUPLICATE_KEY_ERROR_CODE
  );
}

// WH-3: relies on the unique index on `mid` (lib/db.ts ensureIndexes).
// Returns false when this mid was already recorded — a duplicate delivery.
export async function recordWebhookEvent(mid: string, pageId: string): Promise<boolean> {
  try {
    await webhookEventsCollection().insertOne({
      _id: new ObjectId(),
      mid,
      pageId,
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) return false;
    throw err;
  }
}
