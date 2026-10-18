import { ObjectId } from 'mongodb';
import { sellersCollection, type SellerDoc } from '../../lib/db.js';

export async function findSellerById(sellerId: string): Promise<SellerDoc | null> {
  if (!ObjectId.isValid(sellerId)) return null;
  return sellersCollection().findOne({ _id: new ObjectId(sellerId) });
}

export async function findSellerByPageId(pageId: string): Promise<SellerDoc | null> {
  return sellersCollection().findOne({ facebookPageId: pageId });
}

export interface SellerPatch {
  businessName?: string;
  fallbackMessage?: string;
}

export async function patchSeller(sellerId: string, patch: SellerPatch): Promise<SellerDoc | null> {
  if (!ObjectId.isValid(sellerId)) return null;
  return sellersCollection().findOneAndUpdate(
    { _id: new ObjectId(sellerId) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export interface FacebookConnection {
  facebookPageId: string;
  facebookPageName: string;
  facebookPageAccessToken: string;
  webhookSubscribed: boolean;
}

export async function connectFacebookPage(
  sellerId: string,
  connection: FacebookConnection,
): Promise<void> {
  await sellersCollection().updateOne(
    { _id: new ObjectId(sellerId) },
    { $set: { ...connection, updatedAt: new Date() } },
  );
}

export async function disconnectFacebookPage(sellerId: string): Promise<void> {
  await sellersCollection().updateOne(
    { _id: new ObjectId(sellerId) },
    {
      $unset: { facebookPageId: '', facebookPageName: '', facebookPageAccessToken: '' },
      $set: { webhookSubscribed: false, updatedAt: new Date() },
    },
  );
}
