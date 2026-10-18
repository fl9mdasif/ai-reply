import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSharedMongoUri } from './global-setup.js';

describe('FND-2 lib/db.ts', () => {
  let dbModule: typeof import('../src/lib/db.js');

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_db_test';

    dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
  });

  afterAll(async () => {
    await dbModule.closeDb();
  });

  it('creates every index from PRD section 9', async () => {
    const db = dbModule.getDb();

    const sellerIndexes = await db.collection('sellers').indexes();
    expect(sellerIndexes.some((i) => i.key.email === 1 && i.unique)).toBe(true);
    expect(sellerIndexes.some((i) => i.key.facebookPageId === 1 && i.unique && i.sparse)).toBe(
      true,
    );

    const productIndexes = await db.collection('products').indexes();
    expect(productIndexes.some((i) => i.key.sellerId === 1 && i.key.updatedAt === -1)).toBe(true);
    expect(productIndexes.some((i) => i.key.sellerId === 1 && i.key.nameLower === 1)).toBe(true);

    const conversationIndexes = await db.collection('conversations').indexes();
    expect(
      conversationIndexes.some((i) => i.key.sellerId === 1 && i.key.customerPsid === 1 && i.unique),
    ).toBe(true);
    expect(
      conversationIndexes.some((i) => i.key.lastActivityAt === 1 && i.expireAfterSeconds === 2592000),
    ).toBe(true);

    const orderIndexes = await db.collection('orders').indexes();
    expect(orderIndexes.some((i) => i.key.sellerId === 1 && i.key.createdAt === -1)).toBe(true);
    expect(
      orderIndexes.some(
        (i) => i.key.sellerId === 1 && i.key.status === 1 && i.key.createdAt === -1,
      ),
    ).toBe(true);
    expect(orderIndexes.some((i) => i.partialFilterExpression !== undefined)).toBe(true);

    const webhookEventIndexes = await db.collection('webhook_events').indexes();
    expect(webhookEventIndexes.some((i) => i.key.mid === 1 && i.unique)).toBe(true);
    expect(
      webhookEventIndexes.some((i) => i.key.createdAt === 1 && i.expireAfterSeconds === 172800),
    ).toBe(true);
  });

  it('is idempotent: connecting again does not throw or duplicate indexes', async () => {
    await expect(dbModule.connectDb()).resolves.toBeDefined();
    await expect(dbModule.ensureIndexes(dbModule.getDb())).resolves.toBeUndefined();

    const sellerIndexes = await dbModule.getDb().collection('sellers').indexes();
    const emailIndexes = sellerIndexes.filter((i) => i.key.email === 1);
    expect(emailIndexes).toHaveLength(1);
  });

  it('pingDb returns true when connected', async () => {
    await expect(dbModule.pingDb()).resolves.toBe(true);
  });
});
