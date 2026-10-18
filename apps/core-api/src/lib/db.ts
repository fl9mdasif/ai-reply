import { MongoClient, type Db, type ObjectId } from 'mongodb';
import { env } from '../config/env.js';

// PRD section 9.1
export interface SellerDoc {
  _id: ObjectId;
  businessName: string;
  email: string;
  passwordHash: string;
  status: 'active' | 'suspended';
  plan: string;
  facebookPageId?: string;
  facebookPageName?: string;
  facebookPageAccessToken?: string;
  webhookSubscribed: boolean;
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleOAuthRefreshToken?: string;
  fallbackMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// PRD section 9.2
export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ProductDoc {
  _id: ObjectId;
  sellerId: string;
  name: string;
  nameLower: string;
  price: number;
  description?: string;
  faqEntries?: FaqEntry[];
  embedStatus: 'pending' | 'synced' | 'failed';
  embedError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// PRD section 9.5
export interface WebhookEventDoc {
  _id: ObjectId;
  mid: string;
  pageId: string;
  createdAt: Date;
}

// PRD section 9.3
export interface ConversationMessage {
  role: 'customer' | 'assistant';
  text: string;
  ts: Date;
}

export interface OrderDraft {
  product?: string;
  quantity?: number;
  customerName?: string;
  phone?: string;
  address?: string;
  phoneAttempts?: number;
}

export interface ConversationDoc {
  _id: ObjectId;
  sellerId: string;
  customerPsid: string;
  messages: ConversationMessage[];
  state: 'idle' | 'collecting_order' | 'awaiting_confirmation';
  orderDraft?: OrderDraft;
  stateUpdatedAt: Date;
  lastActivityAt: Date;
}

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.MONGODB_DB_NAME);
  await ensureIndexes(db);

  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

export async function pingDb(): Promise<boolean> {
  try {
    await getDb().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export function sellersCollection() {
  return getDb().collection<SellerDoc>('sellers');
}

export function productsCollection() {
  return getDb().collection<ProductDoc>('products');
}

export function conversationsCollection() {
  return getDb().collection<ConversationDoc>('conversations');
}

export function ordersCollection() {
  return getDb().collection('orders');
}

export function webhookEventsCollection() {
  return getDb().collection<WebhookEventDoc>('webhook_events');
}

export async function ensureIndexes(targetDb: Db): Promise<void> {
  await Promise.all([
    targetDb.collection('sellers').createIndex({ email: 1 }, { unique: true }),
    targetDb
      .collection('sellers')
      .createIndex({ facebookPageId: 1 }, { unique: true, sparse: true }),

    targetDb.collection('products').createIndex({ sellerId: 1, updatedAt: -1 }),
    targetDb.collection('products').createIndex({ sellerId: 1, nameLower: 1 }),

    targetDb
      .collection('conversations')
      .createIndex({ sellerId: 1, customerPsid: 1 }, { unique: true }),
    targetDb
      .collection('conversations')
      .createIndex({ lastActivityAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }),

    targetDb.collection('orders').createIndex({ sellerId: 1, createdAt: -1 }),
    targetDb.collection('orders').createIndex({ sellerId: 1, status: 1, createdAt: -1 }),
    targetDb.collection('orders').createIndex(
      { sheetRowWritten: 1, sheetWriteAttempts: 1 },
      { partialFilterExpression: { sheetRowWritten: false } },
    ),

    targetDb.collection('webhook_events').createIndex({ mid: 1 }, { unique: true }),
    targetDb
      .collection('webhook_events')
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 2 }),
  ]);
}
