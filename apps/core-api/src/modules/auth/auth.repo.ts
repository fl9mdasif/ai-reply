import { ObjectId } from 'mongodb';
import { sellersCollection, type SellerDoc } from '../../lib/db.js';

export type NewSeller = Omit<SellerDoc, '_id'>;

export async function insertSeller(doc: NewSeller): Promise<SellerDoc> {
  const fullDoc: SellerDoc = { _id: new ObjectId(), ...doc };
  await sellersCollection().insertOne(fullDoc);
  return fullDoc;
}

export async function findSellerByEmail(email: string): Promise<SellerDoc | null> {
  return sellersCollection().findOne({ email });
}
