import { ObjectId } from 'mongodb';
import { sellersCollection, type SellerDoc } from '../../lib/db.js';

export async function findSellerById(sellerId: string): Promise<SellerDoc | null> {
  if (!ObjectId.isValid(sellerId)) return null;
  return sellersCollection().findOne({ _id: new ObjectId(sellerId) });
}

export interface GoogleConnectionFields {
  googleOAuthRefreshToken: string;
  googleSheetId: string;
  googleSheetUrl: string;
}

export async function saveGoogleConnection(sellerId: string, fields: GoogleConnectionFields): Promise<void> {
  await sellersCollection().updateOne(
    { _id: new ObjectId(sellerId) },
    { $set: { ...fields, updatedAt: new Date() } },
  );
}

// SHT-8
export async function clearGoogleConnection(sellerId: string): Promise<void> {
  await sellersCollection().updateOne(
    { _id: new ObjectId(sellerId) },
    {
      $unset: { googleOAuthRefreshToken: '', googleSheetId: '', googleSheetUrl: '' },
      $set: { updatedAt: new Date() },
    },
  );
}
